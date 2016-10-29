(function () {

  class PathInfo {
    constructor(pathElement) {
      this.element = pathElement;
      this.length = this.element.getTotalLength();
      this._offset = 0.0;
      this._isVisible = true;
      this.element.style.strokeDasharray = `${this.length} ${this.length}`;
    }

    set offset(newOffset) {
      if (newOffset != this._offset) {
        this._offset = newOffset;
        this._setVisible(this._offset < this.length);
        this.element.style.strokeDashoffset = this._offset.toString();
      }
    }

    _setVisible(visible) {
      if (visible != this._isVisible) {
        this._isVisible = visible;
        this.element.style.display = this._isVisible ? '' : 'none';
      }
    }
  }

  class SvgInfo {
    constructor(svgElement) {
      this.element = svgElement;
      this.paths = [];
      this.length = 0;
      Array.from(this.element.querySelectorAll('path')).forEach((path) => {
        let pi = new PathInfo(path);
        this.paths.push(pi);
        this.length += pi.length;
      });
    }

    setDrawingProgress(progress) {
      let desiredLength = this.length * progress;
      let len = 0;
      this.paths.forEach((path) => {
        if (len + path.length <= desiredLength) {
          path.offset = 0.0;
        } else if (len + path.length > desiredLength && len < desiredLength) {
          console.log('>>', path.length, path.length - (desiredLength - len))
          path.offset = path.length - (desiredLength - len);
        } else {
          path.offset = path.length;
        }
        len += path.length;
      });
    }
  }

  class Animation {
    constructor(duration, callback) {
      this.duration = duration;
      this.callback = callback;
      this.startTime = 0;
      this.playing = false;
      this.waiting = false;
      this._progress = 1;
    }

    set progress(p) {
      this.playing = false;
      this._progress = p;
      this.tick();
    }

    play() {
      if (!this.playing) {
        this.playing = true;
        if (this._progress != 1) {
          this.startTime = window.performance.now() - (this.duration * this._progress);
        } else {
          this._progress = 0;
          this.startTime = window.performance.now();
        }
        this.tick();
      }
    }

    pause() {
      this.playing = false;
    }

    resume() {
      this.play();
    }

    stop() {
      this.progress = 1;
    }

    tick() {
      if (this.waiting) return;
      this.waiting = true;
      new Promise(function (resolve, reject) {
        window.requestAnimationFrame(resolve);
      }).then((ts) => {
        this.waiting = false;
        if (this.playing) {
          this._progress = (ts - this.startTime) / this.duration;
          if (this._progress >= 1) {
            this.playing = false;
            this._progress = 1;
          } else {
            this.tick();
          }
        }
        this.callback(this._progress);
      });
    }
  }

  class SvgDrawing {
    beforeRegister() {
      this.is = 'svg-drawing';
      this.properties = {
        duration: {
          type: Number,
          value: 3000,
          reflect: true,
          observer: '_setDuration'
        },
        progress: {
          type: Number,
          value: 1
        },
        auto: {
          type: Boolean,
          value: false
        }
      };
      this._svg = null;
      this._animation = null;
    }

    ready() {
      var svg = this.queryEffectiveChildren('svg');
      console.log(svg);
      if (svg != null) {
        this._svg = new SvgInfo(svg);
        this._animation = new Animation(this.duration, this._svg.setDrawingProgress.bind(this._svg));
      }
    }

    attached() {
      if (this.auto == true) {
        this.play();
      }
    }

    play() {
      this._animation.play();
    }

    pause() {
      this._animation.pause();
    }

    resume() {
      this._animation.resume();
    }

    stop() {
      this._animation.stop();
    }

    _setDuration(d) {
      if (this._animation != null) this._animation.stop();
      if (this._svg != null) {
        this._animation = new Animation(this.duration, this._svg.setDrawingProgress.bind(this._svg));
      }
    }

    setProgress(p) {
      if (this._animation != null) {
        this._animation.progress = p;
      }
    }
  }

  Polymer(SvgDrawing);
})();
