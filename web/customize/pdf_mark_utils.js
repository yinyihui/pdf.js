class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  get x() {
    return this.x || 0;
  }

  get y() {
    return this.y || 0;
  }

  set x(x) {
    this.x = x;
  }

  set y(y) {
    this.y = y;
  }
}

class Mark {
  constructor(startPoint, width, height) {
    this.startPoint = startPoint;
    this.width = width;
    this.height = height;
  }

  get startPoint() {
    return this.startPoint;
  }

  get width() {
    return this.width;
  }

  get height() {
    return this.height;
  }

  set startPoint(startPoint) {
    this.startPoint = startPoint;
  }

  set width(width) {
    this.width = width;
  }

  set height(height) {
    this.height = height;
  }
}

/**
 * 创建画线功能canvas
 * 
 * @param {*} id 
 * @param {*} width 
 * @param {*} height 
 * @param {*} parent 
 */
function createMarkCanvas(id, width, height, parent) {
  let markCanvas = document.createElement("canvas");
  markCanvas.id = id;
  markCanvas.width = width;
  markCanvas.height = height;
  markCanvas.style = "position: absolute; top: 0; left: 0;";
  parent.appendChild(markCanvas);
}

export { Point, Mark, createMarkCanvas};
