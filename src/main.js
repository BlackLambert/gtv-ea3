const canvasID = "wgl-canvas";

const vertexShaderRaw = 
'attribute vec3 coordinates;' +
'attribute vec4 color;' +

'varying vec4 vertexColor;' +
'void main(void) {' +
    'gl_Position = vec4(coordinates, 1.0);' +
    'vertexColor = color;' +
'}';

const fragementShaderRaw = 
'precision mediump float;' +
'varying vec4 vertexColor;' +
'void main(void) {' +
    ' gl_FragColor = vertexColor;' +
'}';

// Translates the LSystem Rules to integer numbers
// Fl = 0
// Fr = 1
// + = 2
// - = 3
const lSystemRules = {
    Fl: [0, 0, 3, 1, 3, 1, 2, 0, 2, 0, 3, 1, 3, 1, 0, 2, 1, 2, 0, 0, 1, 3, 0, 2, 1, 2, 0, 0, 2, 1, 3, 0, 1, 3, 1, 3, 0, 2, 0, 2, 1, 1, 3],
    Fr: [2, 0, 0, 3, 1, 3, 1, 2, 0, 2, 0, 1, 2, 0, 3, 1, 1, 3, 0, 3, 1, 2, 0, 1, 1, 3, 0, 3, 1, 0, 2, 0, 2, 1, 3, 1, 3, 0, 2, 0, 2, 1, 1]
}

const firstPointDelta = [[1,0,0],[0,1,0],[-1,0,0],[0,-1,0]];
const secondPointDelta = [[-1,0,0],[0,-1,0],[1,0,0],[0,1,0]];

const iterrations = 2;
const directions = [[0,1,0],[1,0,0],[0,-1,0],[-1,0,0]];
const colorSpectrum = [[1.0,1.0,0.0,1.0], [1.0,0.0,1.0,1.0], [0.0,1.0,1.0,1.0]];
const colorDelta = 0.02;
const lineThickness = 0.4;
const lineDelta = 1.0/26;
const clearColor = [0.0,0.0,0.0,1.0];

let lSystem = [3, 1];

let vertices = null;
let triangles = null;
let trianglePatternIndex = 0;
let colors = null;

let canvas = document.getElementById(canvasID);
let gl = canvas.getContext('webgl');

let vertexBuffer = null;
let intexBuffer = null
let colorBuffer = null;
let trianglesBuffer = null;

let vertexShader = null;
let fragmentShader = null;
let program = null;
let coordinates = null;
let shaderColors = null;

iterateLSystem();
createGeo();
initWGL();
draw();

function iterateLSystem()
{
    for(var i = 0; i < iterrations; i++)
    {
        lSystem = replaceLSystem(lSystem);
        
    }
    //console.log(lSystem);
}

function replaceLSystem(current)
{
    let newSystem = [];
    
    for(var i = 0; i < current.length; i++)
    {
        //console.log(current[i]);
        if(current[i] === 0)
        {
            newSystem = newSystem.concat(lSystemRules.Fl);
        }
        else if(current[i] === 1)
        {
            newSystem = newSystem.concat(lSystemRules.Fr);
        }
        else if(current[i] === 2)
        {
            newSystem.push(2);
        }
        else if(current[i] === 3)
        {
            newSystem.push(3);
        }
    }
    return newSystem;
}

function createGeo()
{
    let deltaLength = getDelta();
    let currentPosition = [1 - deltaLength/2,+ deltaLength/2,0];
    let directionIndex = 0;
    let verticeIndex = 0;
    let colorIndex = 0;
    
    vertices = [];
    lines = [];
    triangles = [];
    colors = [];

    for(var i = 0; i < lSystem.length; i++)
    {
        if(lSystem[i] === 0 || lSystem[i] === 1)
        {
            let dir = directions[directionIndex];
            let formerPos = currentPosition;
            currentPosition = [
                currentPosition[0] + dir[0] * deltaLength,
                currentPosition[1] + dir[1] * deltaLength,
                currentPosition[2] + dir[2] * deltaLength];
            
            addLinePart(formerPos, currentPosition, directionIndex, verticeIndex, colorIndex);
            verticeIndex += 4;
        }
        else if(lSystem[i] === 2)
        {
            directionIndex = (directionIndex + 1) % directions.length;
            colorIndex = (colorIndex + colorDelta) % colorSpectrum.length;
            addCornerTriangle(verticeIndex, colorIndex);
        }
        else if(lSystem[i] === 3)
        {
            directionIndex = (directionIndex - 1);
            if(directionIndex < 0)
            {
                directionIndex = directions.length + directionIndex;
            }

            colorIndex = (colorIndex + colorDelta) % colorSpectrum.length;
            addCornerTriangle(verticeIndex, colorIndex);
        }
    }

    //console.log(vertices);
    //console.log(lines);
    //console.log(triangles);
    //console.log(colors);
}

function addCornerTriangle(vertexIndex, colorIndex)
{
    if(vertexIndex < 2)
    {
        return;
    }

    let color = calculateColor(colorIndex);
    colors = colors.concat(color);
    triangles.push(vertexIndex);
    triangles.push(vertexIndex - 1);
    triangles.push(vertexIndex - 2);
}

function addLinePart(formerPos, currentPosition, directionIndex, verticeIndex, colorIndex)
{
    let color = calculateColor(colorIndex);
    addLinePoint(formerPos, firstPointDelta[directionIndex], color);
    addLinePoint(formerPos, secondPointDelta[directionIndex], color);
    addLinePoint(currentPosition, firstPointDelta[directionIndex], color);
    addLinePoint(currentPosition, secondPointDelta[directionIndex], color);
    addTrianglePoints(verticeIndex);
}

function addLinePoint(point, offset, color)
{
    let deltaLength = getDelta();

    point = [
        point[0] + offset[0] * deltaLength * lineThickness,
        point[1] + offset[1] * deltaLength * lineThickness,
        point[2] + offset[2] * deltaLength * lineThickness];

    
    addVertice(point);
    colors = colors.concat(color);
}

function calculateColor(index)
{
    let colIndex = Math.floor(index % colorSpectrum.length);
    let minColor = colorSpectrum[colIndex];
    let maxIndex = (colIndex + 1) % colorSpectrum.length;
    let maxColor = colorSpectrum[maxIndex];
    let lerp = index - colIndex;

    //console.log("" + index + " | " + colIndex + " | " + lerp + " | " + minColor + " | " + minColor + " | " + maxIndex + " | " + maxColor);
    let r = minColor[0] - (minColor[0] - maxColor[0]) * lerp;
    let g = minColor[1] - (minColor[1] - maxColor[1]) * lerp;
    let b = minColor[2] - (minColor[2] - maxColor[2]) * lerp;
    let a = minColor[3] - (minColor[3] - maxColor[3]) * lerp;
    return [r, g, b, a];
}

function addTrianglePoints(index)
{
    triangles.push(index);
    triangles.push(index + 1);
    triangles.push(index + 2);
    triangles.push(index + 1);
    triangles.push(index + 2);
    triangles.push(index + 3);
}

function getDelta()
{
    return lineDelta;
}

function addVertice(coords)
{
    let x = coords[0]*2-1;
    let y = coords[1]*2-1;
    point = [x, y, 0];
    vertices = vertices.concat(point);
}


function initWGL()
{
    initBuffers();
    initShader();
    initProgram();
    bindCoordinates();
    bindColors();
    initView();
}

function initBuffers()
{
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    trianglesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trianglesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function initShader()
{
    vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderRaw);
    gl.compileShader(vertexShader);

    fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragementShaderRaw);
    gl.compileShader(fragmentShader);

    //console.log(vertexShaderRaw);
    //console.log(fragementShaderRaw);
}

function initProgram()
{
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
}

function bindCoordinates()
{
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trianglesBuffer);

    //Triangles
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    coordinates = gl.getAttribLocation(program, "coordinates");
    gl.vertexAttribPointer(coordinates, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(coordinates);
}

function bindColors()
{
    //Color
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    shaderColors = gl.getAttribLocation(program, "color");
    gl.vertexAttribPointer(shaderColors, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderColors);
}

function initView()
{
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);
}

function draw()
{
    gl.drawElements(gl.TRIANGLE_STRIP, triangles.length, gl.UNSIGNED_SHORT,0);
}