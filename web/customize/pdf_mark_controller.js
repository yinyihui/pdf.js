import { getGlobalEventBus } from "../ui_utils";
import { MARKTYPE, MARKOPERATION } from "./pdf_mark_utils";

/**
 * 画线实体类
 */
class Mark {
  /**
   * startX:起点x坐标相对当前页左侧比例
   * startY:起点y坐标相对当前页顶部比例
   * endX:终点x坐标相对当前页左侧比例
   * endY:终点y坐标相对当前页顶部比例
   * markType:标记类型，见MARKTYPE
   * isSelected: 是否被选中
   */
  constructor(startX, startY, endX, endY) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;

    this.isSelected = false;
    this.markType = MARKTYPE.NULL;
  }

  /**
   * 设置终点
   * @param {number} endX
   * @param {number} endY
   */
  setEndPoint(endX, endY) {
    this.endX = endX;
    this.endY = endY;
  }

  /**
   * 重置坐标系
   * @param {number} startX
   * @param {number} startY
   * @param {number} endX
   * @param {number} endY
   */
  reset(startX, startY, endX, endY) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
  }

  get mark4Calc() {
    let result = null;
    switch (this.markType) {
      case MARKTYPE.HLINE:
        result = {
          x: this.startX,
          y: this.startY,
          width: this.endX - this.startX,
          height: 0
        };
        break;
      case MARKTYPE.VLINE:
        result = {
          x: this.startX,
          y: this.startY,
          width: 0,
          height: this.endY - this.startY
        };
        break;
      case MARKTYPE.AREA:
        result = {
          x: this.startX,
          y: this.startY,
          width: this.endX - this.startX,
          height: this.endY - this.startY
        };
        break;
      case MARKTYPE.NULL:
      default:
        break;
    }

    return result;
  }
}

/**
 * 画线控制类
 * 主要用于处理canvas画线功能
 * 总体原则：每次新增或删除画线后都需要重新渲染一下canvas
 */
class PDFMarkController {
  constructor(eventBus = getGlobalEventBus(), page = 1) {
    // 事件总线实例
    this.eventBus = eventBus;
    // 当前PDF所在页码
    this._page = page;

    // PDF中所有的画线，全局唯一，改动时需要谨慎
    this._marks = [];
    // 当前操作的画线
    this._mark = null;
    // 当前画线工具栏选中的画线类型
    this._markType = MARKTYPE.NULL;
    // 是否在画线状态
    this._drawMark = false;

    // 注册总线事件，用于跨组件响应
    // 画线类型修改事件
    this.eventBus.on("marktypeset", this._setMarkType.bind(this));
    // 画线重新渲染事件
    this.eventBus.on("markredraw", this._redrawWithCanvas.bind(this));
    // 画线功能失效事件
    this.eventBus.on("markdisable", this._markDisabled.bind(this));
    // 画线类型点击事件
    this.eventBus.on("markoperation", this._markOperation.bind(this));
  }

  get page() {
    return this._page;
  }

  get canvas() {
    return this._canvas;
  }

  /**
   * 设置页码，用于处理页码改变时进行控制类中对应变量的切换
   * @param {number} page
   */
  setPageNumber(page) {
    // 如果切换页面需要将之前canvas事件解绑，防止内存泄漏
    if (this._canvas) {
      this._unbindEvents();
    }

    this._page = page;
    // 初始化当前控制类
    this.init();
  }

  /**
   * 初始化方法
   * 用于初始化canvas实例、上下文、canvas宽高、绑定鼠标事件
   */
  init() {
    let canvas = document.getElementById(`markpage${this._page}`);
    if (canvas) {
      this._canvas = canvas;
      this._context = canvas.getContext("2d");
      this._canvasWidth = canvas.width;
      this._canvasHeight = canvas.height;

      this._setOffsets();
      this._bindEvents();

      // 开始画线时需要把canvas置顶
      if (this._markType != MARKTYPE.NULL) {
        this._canvas.style.zIndex = 9999;
      }

      this._redraw();
    }
  }

  /**
   * 画线工具栏隐藏时解绑事件，销毁内存
   */
  _markDisabled() {
    if (this._canvas) {
      this._unbindEvents();
      this._destroy();
    }
  }

  /**
   * 重新设置canvas在可视域的偏移量
   */
  _setOffsets() {
    this._canvasOffsetX = this._canvas.getBoundingClientRect().left;
    this._canvasOffsetY = this._canvas.getBoundingClientRect().top;
  }

  /**
   * 设置当前画线类型
   * @param {object} param
   */
  _setMarkType(param) {
    this._markType = param.markType;
    if (this._markType == MARKTYPE.NULL) {
      this._markDisabled();
    } else {
      if (this._canvas) {
        this._canvas.style.zIndex = 9999;
      }
    }
  }

  /**
   * 画线工具栏事件点击处理逻辑
   * @param {object} param
   */
  _markOperation(param) {
    let type = param.type;
    let currMarks = this._marks.find(item => item.page == this._page);
    let currIndex = this._marks.indexOf(currMarks);
    switch (type) {
      // 撤销
      case MARKOPERATION.UNDO:
        if (currMarks && currMarks.marks.length) {
          currMarks.marks.pop();
        }
        break;
      // 删除
      case MARKOPERATION.DELETE:
        if (this._mark && currMarks && currMarks.marks.length) {
          let index = currMarks.marks.indexOf(this._mark);
          currMarks.marks.splice(index, 1);
          this._mark = null;
          this.eventBus.dispatch("deletedisable", {
            source: window,
            disabled: true
          });
        }
        break;
      // 清空当前页
      case MARKOPERATION.CLEAR:
        if (currIndex >= 0) {
          this._marks.splice(currIndex, 1);
        }
        break;
      // 清空所有
      case MARKOPERATION.CLEARALL:
        for (let i = 0; i < this._marks.length; i++) {
          let canvas = document.getElementById(
            `markpage${this._marks[i].page}`
          );
          if (canvas) {
            let context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        this._marks = [];
        break;
      // 解析整个文档
      case MARKOPERATION.PARSE:
        if (window.parent && document.referrer) {
          window.parent.postMessage(
            {
              type: "pase",
              data: this._marks
            },
            document.referrer
          );
        }
        break;
      // 解析当前页
      case MARKOPERATION.PARSECURRENT:
        if (window.parent && document.referrer) {
          window.parent.postMessage(
            {
              type: "paseCurrent",
              data: [ currMarks ]
            },
            document.referrer
          );
        }
        break;
      case MARKOPERATION.NULL:
      default:
        break;
    }

    // 重新渲染canvas
    this._redraw();
  }

  /**
   * 变量销毁
   */
  _destroy() {
    this._canvas = null;
    this._context = null;
    this._canvasOffsetX = null;
    this._canvasOffsetY = null;
    this._canvasWidth = null;
    this._canvasHeight = null;
    this._mark = null;
    this._markType = MARKTYPE.NULL;
    this._drawMark = false;
  }

  /**
   * canvas鼠标事件绑定
   */
  _bindEvents() {
    this._canvas.onmousedown = this._canvasClick.bind(this);
    this._canvas.onmouseup = this._canvasMouseUp.bind(this);
    this._canvas.onmousemove = this._canvasMouseMove.bind(this);
  }

  /**
   * canvas鼠标事件解绑
   */
  _unbindEvents() {
    this._canvas.style.zIndex = 0;
    this._canvas.onmousedown = null;
    this._canvas.onmouseup = null;
    this._canvas.onmousemove = null;
  }

  /**
   * 点击canvas触发逻辑
   * @param {MouseEvent} e
   */
  _canvasClick(e) {
    if (this._markType == MARKTYPE.NULL) {
      return;
    }
    // 兼容IE老版本
    e = e || window.event;
    // 重新设置当前canvas偏移
    this._setOffsets();
    let clickX = e.clientX - this._canvasOffsetX;
    let clickY = e.clientY - this._canvasOffsetY;

    this._mark = null;
    let pageMark = this._marks.find(item => item.page == this._page);
    let selected = false;
    // 判断是否选中画线
    if (pageMark && pageMark.marks.length) {
      for (let i = 0; i < pageMark.marks.length; i++) {
        let mark = pageMark.marks[i];
        // 将百分比转换为px值
        let startX = Math.round(mark.startX * this._canvasWidth);
        let startY = Math.round(mark.startY * this._canvasHeight);
        let endX = Math.round(mark.endX * this._canvasWidth);
        let endY = Math.round(mark.endY * this._canvasHeight);
        switch (mark.markType) {
          // 横线
          case MARKTYPE.HLINE:
            selected =
              clickX >= startX - 2 &&
              clickX <= endX + 2 &&
              clickY >= startY - 2 &&
              clickY <= startY + 2 &&
              clickY >= endY - 2 &&
              clickY <= endY + 2;
            break;
          // 竖线
          case MARKTYPE.VLINE:
            selected =
              clickX >= startX - 2 &&
              clickX <= startX + 2 &&
              clickX >= endX - 2 &&
              clickX <= endX + 2 &&
              clickY >= startY - 2 &&
              clickY <= endY + 2;
            break;
          // 方框
          case MARKTYPE.AREA:
            selected =
              (clickX >= startX - 2 &&
                clickX <= endX + 2 &&
                clickY >= startY - 2 &&
                clickY <= startY + 2) ||
              (clickX >= startX - 2 &&
                clickX <= endX + 2 &&
                clickY >= endY - 2 &&
                clickY <= endY + 2) ||
              (clickX >= startX - 2 &&
                clickX <= startX + 2 &&
                clickY >= startY - 2 &&
                clickY <= endY + 2) ||
              (clickX >= endX - 2 &&
                clickX <= endX + 2 &&
                clickY >= startY - 2 &&
                clickY <= endY + 2);
            break;
          case MARKTYPE.NULL:
          default:
            break;
        }
        // 如果存在选中，设置当前mark为选中状态
        if (selected) {
          mark.isSelected = true;
          this._mark = mark;
        } else {
          mark.isSelected = false;
        }
      }
    }
    this._redraw();

    // 选中了mark则高亮删除按钮
    if (this._mark) {
      this._drawMark = false;
      this.eventBus.dispatch("deletedisable", {
        source: window,
        disabled: false
      });
      return;
    }
    // 未选择mark则灰化删除按钮
    this.eventBus.dispatch("deletedisable", { source: window, disabled: true });
    // 记录起点位置
    this._mark = new Mark(
      Number.parseFloat((clickX / this._canvasWidth).toFixed(4)),
      Number.parseFloat((clickY / this._canvasHeight).toFixed(4))
    );
    // 线条类型需要设置起点位置
    if (this._markType == MARKTYPE.HLINE || this._markType == MARKTYPE.VLINE) {
      this._context.beginPath();
      this._context.moveTo(clickX, clickY);
    }
    // 记画线状态为true
    this._drawMark = true;
  }

  /**
   * 鼠标移动事件
   */
  _canvasMouseMove(e) {
    // 画线状态下进入处理逻辑
    if (this._mark && this._drawMark) {
      e = e || window.event;
      let clickX = e.clientX - this._canvasOffsetX;
      let clickY = e.clientY - this._canvasOffsetY;
      let startX = Math.round(this._mark.startX * this._canvasWidth);
      let startY = Math.round(this._mark.startY * this._canvasHeight);
      switch (this._markType) {
        // 横线
        case MARKTYPE.HLINE:
          this._mark.setEndPoint(
            Number.parseFloat((clickX / this._canvasWidth).toFixed(4)),
            this._mark.startY
          );
          this._context.lineTo(clickX, startY);
          this._context.stroke();
          break;
        // 竖线
        case MARKTYPE.VLINE:
          this._mark.setEndPoint(
            this._mark.startX,
            Number.parseFloat((clickY / this._canvasHeight).toFixed(4))
          );
          this._context.lineTo(startX, clickY);
          this._context.stroke();
          break;
        // 方框
        case MARKTYPE.AREA:
          this._context.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
          this._mark.setEndPoint(
            Number.parseFloat((clickX / this._canvasWidth).toFixed(4)),
            Number.parseFloat((clickY / this._canvasHeight).toFixed(4))
          );
          this._context.strokeRect(
            startX,
            startY,
            clickX - startX,
            clickY - startY
          );
          break;
        case MARKTYPE.NULL:
        default:
          break;
      }
    }
  }

  /**
   * 鼠标画线结束触发
   * @param {MouseEvent} e
   */
  _canvasMouseUp(e) {
    // 画线状态下进入处理逻辑
    if (this._mark && this._drawMark) {
      // 以下情况画线失败
      if (
        isNaN(this._mark.endX) || // 终点不存在
        isNaN(this._mark.endY) || // 终点不存在
        (this._mark.startX == this._mark.endX &&
          this._mark.startY == this._mark.endY) || // 终点和起点一致
        (this._markType == MARKTYPE.HLINE &&
          Math.abs(this._mark.startX - this._mark.endX) <= 0.01) || // 横线起点终点距离小于0.01(百分比)
        (this._markType == MARKTYPE.VLINE &&
          Math.abs(this._mark.startY - this._mark.endY) <= 0.01) || // 竖线起点终点距离小于0.01(百分比)
        (this._markType == MARKTYPE.AREA &&
          (Math.abs(this._mark.startX - this._mark.endX) <= 0.01 ||
            Math.abs(this._mark.startY - this._mark.endY) <= 0.01)) // 方框起点终点距离小于0.01(百分比)
      ) {
        this._drawMark = false;
        return;
      }
      this._mark.markType = this._markType;
      // 设置起点终点，规则：起点在终点左上方
      switch (this._markType) {
        // 横线
        case MARKTYPE.HLINE:
          if (this._mark.startX > this._mark.endX) {
            this._mark.reset(
              this._mark.endX,
              this._mark.endY,
              this._mark.startX,
              this._mark.startY
            );
          }
          break;
        // 竖线
        case MARKTYPE.VLINE:
          if (this._mark.startY > this._mark.endY) {
            this._mark.reset(
              this._mark.endX,
              this._mark.endY,
              this._mark.startX,
              this._mark.startY
            );
          }
          break;
        // 方框
        case MARKTYPE.AREA:
          if (
            this._mark.startX > this._mark.endX &&
            this._mark.startY > this._mark.endY
          ) {
            this._mark.reset(
              this._mark.endX,
              this._mark.endY,
              this._mark.startX,
              this._mark.startY
            );
          } else if (this.startX > this.endX && this.startY < this.endY) {
            this._mark.reset(
              this._mark.endX,
              this._mark.startY,
              this._mark.startX,
              this._mark.endY
            );
          } else if (this.startX < this.endX && this.startY > this.endY) {
            this._mark.reset(
              this._mark.startX,
              this._mark.endY,
              this._mark.endX,
              this._mark.startY
            );
          }
          break;
        case MARKTYPE.NULL:
        default:
          break;
      }
      let pageMark = this._marks.find(item => item.page == this._page);
      if (pageMark) {
        pageMark.marks.push(this._mark);
      } else {
        this._marks.push({
          page: this._page,
          marks: [this._mark]
        });
      }
      this._redraw();
    }
    this._drawMark = false;
  }

  /**
   * 重新渲染
   */
  _redraw() {
    if (this._context) {
      this._context.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
      let pageMark = this._marks.find(item => item.page == this._page);
      if (pageMark && pageMark.marks.length) {
        this._drawPageMarks(pageMark);
      }
    }
  }

  /**
   * 根据canvas重新渲染
   * @param {object} param
   */
  _redrawWithCanvas(param) {
    let canvas = param.canvas;
    this._canvas = canvas;
    this._context = canvas.getContext("2d");
    this._canvasWidth = canvas.width;
    this._canvasHeight = canvas.height;

    this._setOffsets();
    this._bindEvents();

    this._context.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
    let pageMark = this._marks.find(item => item.page == this._page);
    if (pageMark && pageMark.marks.length) {
      this._drawPageMarks(pageMark);
    }
  }

  /**
   * 渲染当前页面canvas
   * @param {object} pageMark
   */
  _drawPageMarks(pageMark) {
    for (var i = 0; i < pageMark.marks.length; i++) {
      var mark = pageMark.marks[i];
      switch (mark.markType) {
        case MARKTYPE.HLINE:
        case MARKTYPE.VLINE:
          this._context.beginPath();
          this._context.moveTo(
            Math.round(mark.startX * this._canvasWidth),
            Math.round(mark.startY * this._canvasHeight)
          );
          this._context.lineTo(
            Math.round(mark.endX * this._canvasWidth),
            Math.round(mark.endY * this._canvasHeight)
          );
          if (mark.isSelected) {
            this._context.lineWidth = 5;
          } else {
            this._context.lineWidth = 1;
          }
          this._context.stroke();
          break;
        case MARKTYPE.AREA:
          if (mark.isSelected) {
            this._context.lineWidth = 5;
          } else {
            this._context.lineWidth = 1;
          }
          this._context.strokeRect(
            Math.round(mark.startX * this._canvasWidth),
            Math.round(mark.startY * this._canvasHeight),
            Math.round((mark.endX - mark.startX) * this._canvasWidth),
            Math.round((mark.endY - mark.startY) * this._canvasHeight)
          );
          break;
        case MARKTYPE.NULL:
        default:
          break;
      }
    }
  }
}

export { PDFMarkController };
