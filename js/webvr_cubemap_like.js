// Copyright (c) 2018, Dongseong Hwang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

// TODO(dshwang): enable it when supported.
// import defaultExport from 'utility';

(function() {
const CAMERA_SETTINGS = function() {
  return {fov : 60 * Math.PI / 180, near : 0.01, far : 10000};
}();

class WebVR {
  constructor() {
    this.addEventListeners();
    this.canvas_ = document.createElement('canvas');
    this.onResize();
    document.body.appendChild(this.canvas_);

    this.gl_ = this.canvas_.getContext('webgl2', {antialias : true});
    const isWebGL2 = !!this.gl_;
    if (!isWebGL2) {
      document.getElementById('info').innerHTML =
          'WebGL 2 is not available.' +
          ' See <a href="https://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">' +
          ' How to get a WebGL 2 implementation</a>';
      return;
    }

    this.initProgram();
    this.setVertexArray();
    this.initTexture();
    this.initRenderVariables();
    this.setMouseBehavior();
    this.render_ = this.render.bind(this);

  }

  addEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.width_ = window.innerWidth;
    this.height_ = window.innerHeight;
    this.canvas_.width = window.innerWidth;
    this.canvas_.height = window.innerHeight;
    this.aspect_ = this.width_ / this.height_;
    this.initRenderVariables();
  }

  initProgram() {
    this.program_ =
        createProgram(this.gl_, getShaderSource('vs'), getShaderSource('fs'));
    this.mvMatrixLocation_ =
        this.gl_.getUniformLocation(this.program_, 'mvMatrix');
    this.pMatrixLocation_ =
        this.gl_.getUniformLocation(this.program_, 'pMatrix');
    this.textureLocation_ =
        this.gl_.getUniformLocation(this.program_, 'sTexture');
    this.texScaleLocation_ =
        this.gl_.getUniformLocation(this.program_, 'uTexScale');
  }

  setVertexArray() {
    /* clang-format off */
    // -- Init buffers
    const positions = new Float32Array([
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
    /* clang-format on */
    this.vertexPosBuffer_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexPosBuffer_);
    this.gl_.bufferData(this.gl_.ARRAY_BUFFER, positions, this.gl_.STATIC_DRAW);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

    /* clang-format off */
    const texCoords = new Float32Array([
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
    /* clang-format on */
    this.vertexTexBuffer_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexTexBuffer_);
    this.gl_.bufferData(this.gl_.ARRAY_BUFFER, texCoords, this.gl_.STATIC_DRAW);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

    /* clang-format off */
    const texOffsetCoords = new Float32Array([
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
    /* clang-format on */
    this.vertexTexOffsetBuffer_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexTexOffsetBuffer_);
    this.gl_.bufferData(this.gl_.ARRAY_BUFFER, texOffsetCoords,
                        this.gl_.STATIC_DRAW);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

    // Element buffer
    this.indexBuffer_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ELEMENT_ARRAY_BUFFER, this.indexBuffer_);

    const cubeVertexIndices = [
      0,  1,  2,  0,  2,  3,  // front
      4,  5,  6,  4,  6,  7,  // back
      8,  9,  10, 8,  10, 11, // top
      12, 13, 14, 12, 14, 15, // bottom
      16, 17, 18, 16, 18, 19, // right
      20, 21, 22, 20, 22, 23  // left
    ];

    // Now send the element array to GL
    this.gl_.bufferData(this.gl_.ELEMENT_ARRAY_BUFFER,
                        new Uint16Array(cubeVertexIndices),
                        this.gl_.STATIC_DRAW);

    // -- Init VertexArray
    this.vertexArray_ = this.gl_.createVertexArray();
    this.gl_.bindVertexArray(this.vertexArray_);

    // set with GLSL layout qualifier
    const vertexPosLocation = 0;
    const vertexTexLocation = 1;
    const vertexTexOffsetLocation = 2;

    this.gl_.enableVertexAttribArray(vertexPosLocation);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexPosBuffer_);
    this.gl_.vertexAttribPointer(vertexPosLocation, 3, this.gl_.FLOAT, false, 0,
                                 0);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

    this.gl_.enableVertexAttribArray(vertexTexLocation);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexTexBuffer_);
    this.gl_.vertexAttribPointer(vertexTexLocation, 2, this.gl_.FLOAT, false, 0,
                                 0);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

    this.gl_.enableVertexAttribArray(vertexTexOffsetLocation);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexTexOffsetBuffer_);
    this.gl_.vertexAttribPointer(vertexTexOffsetLocation, 2, this.gl_.FLOAT,
                                 false, 0, 0);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

    this.gl_.bindBuffer(this.gl_.ELEMENT_ARRAY_BUFFER, this.indexBuffer_);

    this.gl_.bindVertexArray(null);
  }

  initTexture() {
    const imageUrl = 'images/cubemap.jpeg';
    this.texture_;
    loadImage(imageUrl, this.onLoadImage.bind(this));
  }

  onLoadImage(image) {
    // -- Init 2D Texture
    this.texture_ = this.gl_.createTexture();
    this.gl_.activeTexture(this.gl_.TEXTURE0);
    this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.texture_);
    this.gl_.pixelStorei(this.gl_.UNPACK_FLIP_Y_WEBGL, false);
    this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_MAG_FILTER,
                           this.gl_.LINEAR);
    this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_MIN_FILTER,
                           this.gl_.LINEAR);
    this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_WRAP_S,
                           this.gl_.CLAMP_TO_EDGE);
    this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_WRAP_T,
                           this.gl_.CLAMP_TO_EDGE);

    // -- Allocate storage for the texture
    this.gl_.texImage2D(this.gl_.TEXTURE_2D, 0, this.gl_.RGB, this.gl_.RGB,
                        this.gl_.UNSIGNED_BYTE, image);
    this.gl_.generateMipmap(this.gl_.TEXTURE_2D);

    requestAnimationFrame(this.render_);
  }

  initRenderVariables() {
    this.modelMatrix = mat4.create();
    this.modelQuat = quat.create();
    this.mvMatrix = mat4.create();

    this.viewMatrix = mat4.create();
    this.perspectiveMatrix = mat4.create();
    mat4.perspective(this.perspectiveMatrix, CAMERA_SETTINGS.fov, this.aspect_,
                     CAMERA_SETTINGS.near, CAMERA_SETTINGS.far);
  }

  setMouseBehavior() {
    this.mouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.canvas_.onmousedown = this.onMouseDown.bind(this);
    this.canvas_.onmouseup = this.onMouseUp.bind(this);
    this.canvas_.onmousemove = this.onMouseMove.bind(this);
  }

  onMouseDown(event) {
    this.mouseDown = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  };

  onMouseUp(event) { this.mouseDown = false; }

  onMouseMove(event) {
    if (this.mouseDown) {
      const newX = event.clientX;
      const newY = event.clientY;

      const amplifier = 0.1;
      let deltaY = -(newX - this.lastMouseX) * amplifier;
      let deltaX = -(newY - this.lastMouseY) * amplifier;

      // horizontal rotation doesn't bother with vertical.
      let snap = 4;
      if (Math.abs(deltaY) > (snap * Math.abs(deltaX))) {
        deltaX = 0;
      } else if (Math.abs(deltaX) > (snap * Math.abs(deltaY))) {
        deltaY = 0;
      }

      let dq = quat.create();
      quat.fromEuler(dq, deltaX, deltaY, 0);
      // https://github.com/ds-hwang/wiki/wiki/VR-mathematics:-opengl-matrix,-transform,-quaternion,-euler-angles,-homography-transformation,-reprojection#dq--q2q1
      // q2 = dq·q1
      quat.multiply(this.modelQuat, dq, this.modelQuat);
      mat4.fromQuat(this.modelMatrix, this.modelQuat);

      this.lastMouseX = newX;
      this.lastMouseY = newY;
    }
  }

  render() {
    // -- Render
    this.gl_.viewport(0, 0, this.width_, this.height_);
    this.gl_.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl_.clear(this.gl_.COLOR_BUFFER_BIT);

    this.gl_.enable(this.gl_.DEPTH_TEST);
    this.gl_.enable(this.gl_.CULL_FACE);
    this.gl_.cullFace(this.gl_.BACK);

    mat4.multiply(this.mvMatrix, this.viewMatrix, this.modelMatrix);

    this.gl_.bindVertexArray(this.vertexArray_);
    this.gl_.useProgram(this.program_);
    this.gl_.uniformMatrix4fv(this.mvMatrixLocation_, false, this.mvMatrix);
    this.gl_.uniformMatrix4fv(this.pMatrixLocation_, false,
                              this.perspectiveMatrix);
    this.gl_.uniform1i(this.textureLocation_, 0);
    this.gl_.uniform2f(this.texScaleLocation_, 1 / 3, 1 / 2);

    this.gl_.activeTexture(this.gl_.TEXTURE0);
    this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.texture_);

    this.gl_.drawElementsInstanced(this.gl_.TRIANGLES, 36,
                                   this.gl_.UNSIGNED_SHORT, 0, 1);

    requestAnimationFrame(this.render_);
  }

  destructuring() {
    this.gl_.deleteBuffer(this.vertexPosBuffer_);
    this.gl_.deleteBuffer(this.vertexTexBuffer_);
    this.gl_.deleteBuffer(this.vertexTexOffsetBuffer_);
    this.gl_.deleteBuffer(this.indexBuffer_);
    this.gl_.deleteTexture(this.texture_);
    this.gl_.deleteProgram(this.program_);
    this.gl_.deleteVertexArray(this.vertexArray_);
  }
}

new WebVR();
})();
