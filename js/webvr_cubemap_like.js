
'use strict';

(function () {

    var canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    var gl = canvas.getContext('webgl2', { antialias: true });
    var isWebGL2 = !!gl;
    if (!isWebGL2) {
        document.getElementById('info').innerHTML = 'WebGL 2 is not available.' +
            ' See <a href="https://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">' +
            ' How to get a WebGL 2 implementation</a>';
        return;
    }

    // -- Init program
    var program = createProgram(gl, getShaderSource('vs'), getShaderSource('fs'));
    var mvMatrixLocation = gl.getUniformLocation(program, 'mvMatrix');
    var pMatrixLocation = gl.getUniformLocation(program, 'pMatrix');
    var textureLocation = gl.getUniformLocation(program, 'sTexture');
    var texScaleLocation = gl.getUniformLocation(program, 'uTexScale');

    // -- Init buffers
    var positions = new Float32Array([
        // Front face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, 1.0, -1.0,
        -1.0, 1.0, -1.0,

        // Back face
        1.0, -1.0, 1.0,
        -1.0, -1.0, 1.0,
        -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,

        // Top face
        -1.0, 1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,

        // Bottom face
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0,
        1.0, -1.0, -1.0,
        -1.0, -1.0, -1.0,

        // Right face
        1.0, -1.0, -1.0,
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, -1.0,

        // Left face
        -1.0, -1.0, 1.0,
        -1.0, -1.0, -1.0,
        -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0
    ]);
    var vertexPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    var texCoords = new Float32Array([
        // Front face
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,

        // Back face
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,

        // Top face
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,

        // Bottom face
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,

        // Right face
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,

        // Left face
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,
    ]);
    var vertexTexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    var texOffsetCoords = new Float32Array([
        // Front face
        1. / 3, 1. / 2,
        1. / 3, 1. / 2,
        1. / 3, 1. / 2,
        1. / 3, 1. / 2,

        // Back face
        2. / 3, 1. / 2,
        2. / 3, 1. / 2,
        2. / 3, 1. / 2,
        2. / 3, 1. / 2,

        // Top face
        2. / 3, 0,
        2. / 3, 0,
        2. / 3, 0,
        2. / 3, 0,

        // Bottom face
        0, 1. / 2,
        0, 1. / 2,
        0, 1. / 2,
        0, 1. / 2,

        // Right face
        0, 0,
        0, 0,
        0, 0,
        0, 0,

        // Left face
        1. / 3, 0,
        1. / 3, 0,
        1. / 3, 0,
        1. / 3, 0,
    ]);
    var vertexTexOffsetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexOffsetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texOffsetCoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Element buffer
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    var cubeVertexIndices = [
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23    // left
    ];

    // Now send the element array to GL

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

    // -- Init VertexArray
    var vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);

    // set with GLSL layout qualifier
    var vertexPosLocation = 0;
    var vertexTexLocation = 1;
    var vertexTexOffsetLocation = 2;

    gl.enableVertexAttribArray(vertexPosLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
    gl.vertexAttribPointer(vertexPosLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.enableVertexAttribArray(vertexTexLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexBuffer);
    gl.vertexAttribPointer(vertexTexLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.enableVertexAttribArray(vertexTexOffsetLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexOffsetBuffer);
    gl.vertexAttribPointer(vertexTexOffsetLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.bindVertexArray(null);

    // -- Init Texture
    var imageUrl = 'images/cubemap.jpeg';
    var texture;
    loadImage(imageUrl, function (image) {
        // -- Init 2D Texture
        texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // -- Allocate storage for the texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);

        requestAnimationFrame(render);

    });

    // -- Initialize render variables
    var modelMatrix = mat4.create();
    var modelQuat = quat.create();
    var mvMatrix = mat4.create();

    var viewMatrix = mat4.create();
    var perspectiveMatrix = mat4.create();
    var fov = 60 * Math.PI / 180;
    var aspect = canvas.width / canvas.height;
    var near = 0.01;
    var far = 10000;
    mat4.perspective(perspectiveMatrix, fov, aspect, near, far);

    // -- Mouse Behaviour
    var mouseDown = false;
    var lastMouseX = 0;
    var lastMouseY = 0;

    canvas.onmousedown = function (event) {
        mouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    };

    canvas.onmouseup = function (event) {
        mouseDown = false;
    };

    canvas.onmousemove = function (event) {
        if (mouseDown) {
            var newX = event.clientX;
            var newY = event.clientY;

            var amplifier = 0.1;
            var deltaY = -(newX - lastMouseX) * amplifier;
            var deltaX = -(newY - lastMouseY) * amplifier;

            // horizontal rotation doesn't bother with vertical.
            var snap = 4;
            if (Math.abs(deltaY) > (snap * Math.abs(deltaX))) {
                deltaX = 0;
            } else if (Math.abs(deltaX) > (snap * Math.abs(deltaY))) {
                deltaY = 0;
            }

            var dq = quat.create();
            quat.fromEuler(dq, deltaX, deltaY, 0);
            // https://github.com/ds-hwang/wiki/wiki/VR-mathematics:-opengl-matrix,-transform,-quaternion,-euler-angles,-homography-transformation,-reprojection#dq--q2q1
            // q2 = dq·q1
            quat.multiply(modelQuat, dq, modelQuat);
            mat4.fromQuat(modelMatrix, modelQuat);

            lastMouseX = newX;
            lastMouseY = newY;
        }
    };

    function render() {
        // -- Render
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        mat4.multiply(mvMatrix, viewMatrix, modelMatrix);

        gl.bindVertexArray(vertexArray);
        gl.useProgram(program);
        gl.uniformMatrix4fv(mvMatrixLocation, false, mvMatrix);
        gl.uniformMatrix4fv(pMatrixLocation, false, perspectiveMatrix);
        gl.uniform1i(textureLocation, 0);
        gl.uniform2f(texScaleLocation, 1 / 3, 1 / 2);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.drawElementsInstanced(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0, 1);

        requestAnimationFrame(render);
    }

    // If you have a long-running page, and need to delete WebGL resources, use:
    //
    // gl.deleteBuffer(vertexPosBuffer);
    // gl.deleteBuffer(vertexTexBuffer);
    // gl.deleteBuffer(indexBuffer);
    // gl.deleteTexture(texture);
    // gl.deleteProgram(program);
    // gl.deleteVertexArray(vertexArray);

})();
