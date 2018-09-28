// Copyright (c) 2018, Dongseong Hwang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

// TODO(dshwang): enable it when supported.
// import defaultExport from 'utility';

(function(stratage) {
if (!navigator.xr) {
  var polyfill = new WebXRPolyfill();
}

const CAMERA_SETTINGS = function() {
  return {fov : 60 * Math.PI / 180, near : 0.01, far : 10000};
}();

class WebXR {
  constructor() {
    this.addEventListeners();
    this.canvas_ = document.createElement('canvas');
    this.onResize();
    document.body.appendChild(this.canvas_);
    this.createGLContext({antialias : false, alpha : true});
    this.setMouseBehavior();

    if (navigator.xr) {
      this.xr_ = {device : null, session : null, frameOfRef : null};
      this.getXRDevice();
    } else {
      this.showWebXRNotSupportedError();
    }

    this.render_ = this.render.bind(this);
  }

  showWebXRNotSupportedError() { console.error('WebXR not supported'); }

  createGLContext(option) {
    this.gl_ = this.canvas_.getContext('webgl2', option);
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
  }

  getXRDevice() {
    navigator.xr.requestDevice().then(
        device => {
          this.xr_.device = device;
          // ‘Immersive’ means rendering into the HMD.
          this.xr_.device.supportsSession({immersive : true})
              .then(() => { this.createPresentationButton(); })
              .catch((err) => { console.log("XR not supported: " + err); });
        },
        err => {
          if (err.message === 'NotFoundError') {
            // No XRDevices available.
            console.error('No XR devices available :', err);
          } else {
            // An error occurred while requesting an XRDevice.
            console.error('Requesting XR device failed :', err);
          }
        });
  }

  async activateVR() {
    if (!this.xr_.device)
      return;

    this.xr_.device.requestSession({immersive : true})
        .then(
            session => {
              this.xr_.session = session;
              this.xr_.session.addEventListener(
                  'end', _ => { this.onSessionEnded(); });

              this.xr_.session.depthNear = CAMERA_SETTINGS.near;
              this.xr_.session.depthFar = CAMERA_SETTINGS.far;

              // Create the WebGL layer.
              this.gl_.setCompatibleXRDevice(this.xr_.device);
              this.xr_.session.baseLayer =
                  new XRWebGLLayer(this.xr_.session, this.gl_);

              this.button_.textContent = 'Disable XR';

              session.requestFrameOfReference('eye-level')
                  .then((frameOfRef) => {
                    this.xr_.frameOfRef = frameOfRef;

                    // Enter the rendering loop.
                    this.xr_.session.requestAnimationFrame(this.render_);
                  });
            },
            error => {
              console.log("Error while requesting the immersive session : " +
                          error);
            });
  }

  async onSessionEnded() {
    this.xr_.session = null;
    this.xr_.frameOfRef = null;
    this.gl_.bindFramebuffer(this.gl_.FRAMEBUFFER, null);
    requestAnimationFrame(this.render_);
  }

  async deactivateVR() {
    if (!this.xr_.device)
      return;

    if (!this.xr_.session)
      return;

    await this.xr_.session.end();
    this.button_.textContent = 'Enable XR';
  }

  createPresentationButton() {
    this.button_ = document.createElement('button');
    this.button_.classList.add('vr-toggle');
    this.button_.textContent = 'Enable XR';
    this.button_.addEventListener('click', _ => { this.toggleVR(); });
    document.body.appendChild(this.button_);
  }

  toggleVR() {
    if (this.xr_.session)
      return this.deactivateVR();

    return this.activateVR();
  }

  addEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() { this.resizeCanvas(window.innerWidth, window.innerHeight); }

  resizeCanvas(width, height) {
    this.width_ = window.innerWidth;
    this.height_ = window.innerHeight;
    this.canvas_.width = this.width_;
    this.canvas_.height = this.height_;
    this.initRenderVariables();
  }

  initProgram() {
    this.program_ = util.createProgram(this.gl_, util.getShaderSource('vs'),
                                       util.getShaderSource('fs'));
    this.mvMatrixLocation_ =
        this.gl_.getUniformLocation(this.program_, 'mvMatrix');
    this.pMatrixLocation_ =
        this.gl_.getUniformLocation(this.program_, 'pMatrix');
    this.textureLocation_ =
        this.gl_.getUniformLocation(this.program_, 'sTexture');
    this.texScaleLocation_ =
        this.gl_.getUniformLocation(this.program_, 'uTexScale');

    this.gl_.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl_.enable(this.gl_.DEPTH_TEST);
    this.gl_.enable(this.gl_.CULL_FACE);
    this.gl_.cullFace(this.gl_.BACK);
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

    const texCoords = stratage.getTexCoords();
    this.vertexTexBuffer_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexTexBuffer_);
    this.gl_.bufferData(this.gl_.ARRAY_BUFFER, texCoords, this.gl_.STATIC_DRAW);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

    const texOffsetCoords = stratage.getTexOffsetCoords();
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

  initTexture() { stratage.loadImageSource(this.onLoadImageSource.bind(this)); }

  onLoadImageSource(imageSource, width, height) {
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
    this.gl_.texImage2D(this.gl_.TEXTURE_2D, 0, this.gl_.RGBA, width, height, 0,
                        this.gl_.RGBA, this.gl_.UNSIGNED_BYTE, imageSource);

    requestAnimationFrame(this.render_);
  }

  initRenderVariables() {
    this.mvMatrix_ = mat4.create();
    this.rotationVec_ = vec3.create();

    this.projectionMatrix_ = mat4.create();

    const aspect = this.width_ / this.height_;
    mat4.perspective(this.projectionMatrix_, CAMERA_SETTINGS.fov, aspect,
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
    if (this.isVrMode())
      return;

    this.mouseDown = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  };

  onMouseUp(event) { this.mouseDown = false; }

  onMouseMove(event) {
    if (this.mouseDown) {
      const newX = event.clientX;
      const newY = event.clientY;

      const amplifier = 0.1 * Math.PI / 180;
      let deltaX = -(newY - this.lastMouseY) * amplifier;
      let deltaY = -(newX - this.lastMouseX) * amplifier;

      let newXRot = this.rotationVec_[0] + deltaX;
      newXRot = Math.max(Math.min(newXRot, Math.PI / 2), -Math.PI / 2);
      const newYRot = this.rotationVec_[1] + deltaY;
      vec3.set(this.rotationVec_, newXRot, newYRot, 0);

      const xRotMat = mat4.create();
      mat4.fromXRotation(xRotMat, newXRot);
      const yRotMat = mat4.create();
      mat4.fromYRotation(yRotMat, newYRot);
      const RotMat = mat4.create();
      mat4.multiply(this.mvMatrix_, xRotMat, yRotMat);

      this.lastMouseX = newX;
      this.lastMouseY = newY;
    }
  }

  isVrMode() { return this.xr_ && this.xr_.session; }

  render(timestamp, xrFrame) {
    stratage.updateTexture(this.gl_, this.texture_);
    this.gl_.clear(this.gl_.COLOR_BUFFER_BIT);
    if (!this.isVrMode()) {
      const viewport =
          {x : 0, y : 0, width : this.width_, height : this.height_};
      this.renderEye(this.mvMatrix_, this.projectionMatrix_, viewport);
      requestAnimationFrame(this.render_);
      return;
    }
    if (!xrFrame)
      return;

    // Get pose data.
    let pose = xrFrame.getDevicePose(this.xr_.frameOfRef);
    if (!pose)
      return;

    let xrLayer = this.xr_.session.baseLayer;
    this.resizeCanvas(xrLayer.framebufferWidth, xrLayer.framebufferHeight);
    this.gl_.bindFramebuffer(this.gl_.FRAMEBUFFER, xrLayer.framebuffer);

    for (let view of xrFrame.views) {
      let viewport = xrLayer.getViewport(view);
      this.renderEye(pose.getViewMatrix(view), view.projectionMatrix, viewport);
    }

    // Use the XR display's in-built rAF (which can be a diff refresh rate to
    // the default browser one).
    this.xr_.session.requestAnimationFrame(this.render_);
  }

  renderEye(mvMatrix, projectionMatrix, viewport) {
    this.gl_.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

    this.gl_.bindVertexArray(this.vertexArray_);
    this.gl_.useProgram(this.program_);
    this.gl_.uniformMatrix4fv(this.mvMatrixLocation_, false, mvMatrix);
    this.gl_.uniformMatrix4fv(this.pMatrixLocation_, false, projectionMatrix);
    this.gl_.uniform1i(this.textureLocation_, 0);
    const scale = stratage.getScale();
    this.gl_.uniform2f(this.texScaleLocation_, scale.x, scale.y);

    this.gl_.activeTexture(this.gl_.TEXTURE0);
    this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.texture_);

    this.gl_.drawElementsInstanced(this.gl_.TRIANGLES, 36,
                                   this.gl_.UNSIGNED_SHORT, 0, 1);
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

new WebXR();
})(stratage);
