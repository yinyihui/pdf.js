import { NullL10n } from "../ui_utils.js";
import { MARKTYPE, MARKOPERATION } from "./pdf_mark_utils.js";

/**
 * 画线工具栏
 * 1、提供横线/竖线/方框三种选择形式
 * 2、提供撤销一步/删除已选/清空当前页/清空所有功能
 * 3、提供解析功能，可以解析当前页或者全部文档，并设置非空列
 */
class PDFMarkBar {
  constructor(options, eventBus, l10n = NullL10n) {
    this.opened = false;
    this.markType = MARKTYPE.NULL;

    this.bar = options.bar || null;
    this.toggleButton = options.toggleButton || null;
    this.markHLine = options.markHLine || null;
    this.markVLine = options.markVLine || null;
    this.markArea = options.markArea || null;
    this.undoMark = options.undoMark || null;
    this.delete = options.delete || null;
    this.clear = options.clear || null;
    this.clearAll = options.clearAll || null;
    this.parse = options.parse || null;
    this.parseCurrent = options.parseCurrent || null;
    this.nonEmptyCols = options.nonEmptyCols || null;
    this.eventBus = eventBus;
    this.l10n = l10n;

    // Add event listeners to the DOM elements.
    this.toggleButton.addEventListener("click", () => {
      this.toggle();
    });

    this.bar.addEventListener("keydown", e => {
      switch (e.keyCode) {
        case 27: // Escape
          this.close();
          break;
      }
    });

    // 横线按钮事件监听
    this.markHLine.addEventListener("click", () => {
      if (this.markType == MARKTYPE.HLINE) {
        this.select(MARKTYPE.NULL);
      } else {
        this.select(MARKTYPE.HLINE);
      }
    });

    // 竖线按钮事件监听
    this.markVLine.addEventListener("click", () => {
      if (this.markType == MARKTYPE.VLINE) {
        this.select(MARKTYPE.NULL);
      } else {
        this.select(MARKTYPE.VLINE);
      }
    });

    // 方框按钮事件监听
    this.markArea.addEventListener("click", () => {
      if (this.markType == MARKTYPE.AREA) {
        this.select(MARKTYPE.NULL);
      } else {
        this.select(MARKTYPE.AREA);
      }
    });

    // 撤销按钮事件监听
    this.undoMark.addEventListener("click", () => {
      this.eventBus.dispatch("markoperation", {
        source: window,
        type: MARKOPERATION.UNDO
      });
    });

    // 删除按钮事件监听
    this.delete.addEventListener("click", () => {
      this.eventBus.dispatch("markoperation", {
        source: window,
        type: MARKOPERATION.DELETE
      });
    });

    // 清空当前页按钮事件监听
    this.clear.addEventListener("click", () => {
      this.eventBus.dispatch("markoperation", {
        source: window,
        type: MARKOPERATION.CLEAR
      });
    });

    // 清空所有按钮事件监听
    this.clearAll.addEventListener("click", () => {
      this.eventBus.dispatch("markoperation", {
        source: window,
        type: MARKOPERATION.CLEARALL
      });
    });

    // 解析文档按钮事件监听
    this.parse.addEventListener("click", () => {
      this.eventBus.dispatch("markoperation", {
        source: window,
        type: MARKOPERATION.PARSE
      });
    });

    // 解析当前页按钮事件监听
    this.parseCurrent.addEventListener("click", () => {
      this.eventBus.dispatch("markoperation", {
        source: window,
        type: MARKOPERATION.PARSECURRENT
      });
    });

    // 注册总线事件，用于跨组件响应
    // 调整浏览器大小触发
    this.eventBus.on("resize", this._adjustWidth.bind(this));
    // 关闭画线工具栏
    this.eventBus.on("forcemarkbarclose", this.close.bind(this));
    // 删除按钮灰化
    this.eventBus.on("deletedisable", this.deleteDisable.bind(this));
    this.delete.disabled = true;
  }

  /**
   * 打开画线工具栏
   */
  open() {
    if (!this.opened) {
      this.opened = true;
      this.toggleButton.classList.add("toggled");
      this.bar.classList.remove("hidden");
    }
    this.markHLine.focus();
    this._adjustWidth();

    // 关系搜索工具栏
    this.eventBus.dispatch("forcefindbarclose", { source: window });
  }

  /**
   * 关闭画线工具栏
   */
  close() {
    if (!this.opened) {
      return;
    }
    this.opened = false;
    this.toggleButton.classList.remove("toggled");
    this.bar.classList.add("hidden");

    this.select(MARKTYPE.NULL);

    // 触发画线功能失效事件
    this.eventBus.dispatch("markdisable", { source: window });
  }

  /**
   * 画线工具栏切换
   */
  toggle() {
    if (this.opened) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 选择画线类型
   * @param {number} markType 
   */
  select(markType) {
    for (let i = 0; i < 3; i++) {
      this.bar.children[i].classList.remove("toggled");
    }
    this.markType = markType;
    if (markType > -1) {
      this.bar.children[markType].classList.add("toggled");
    }

    // 触发画线类型修改事件
    this.eventBus.dispatch("marktypeset", { source: window, markType });
  }

  /**
   * 删除按钮灰化
   * @param {object} param 
   */
  deleteDisable(param) {
    this.delete.disabled = param.disabled;
  }

  /**
   * @private
   * 
   */
  /**
   * 尺寸调整
   */
  _adjustWidth() {
    if (!this.opened) {
      return;
    }

    this.bar.classList.remove("wrapContainers");

    let barHeight = this.bar.clientHeight;
    let inputHeight = this.bar.lastElementChild.clientHeight;

    if (barHeight > inputHeight) {
      this.bar.classList.add("wrapContainers");
    }
  }
}

export { PDFMarkBar };
