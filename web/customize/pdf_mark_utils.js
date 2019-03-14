/**
 * 画线功能掩码，用于判断是否打开画线功能
 * 0001
 */
const SUPPORT_MARK = 1;

/**
 * 标记类型：
 * NULL(-1)-不标记
 * HLINE(0)-横线
 * VLINE(1)-竖线
 * AREA(2)-区域
 */
const MARKTYPE = {
  NULL: -1, // 不标记
  HLINE: 0, // 横线
  VLINE: 1, // 竖线
  AREA: 2 // 区域
};

/**
 * 操作类型：
 * NULL(-1)-无操作
 * UNDO(0)-撤销一步
 * DELETE(1)-删除选中
 * CLEAR:(2)-清空当前页
 * CLEARALL:(3)-清空所有
 * PARSE:(4)-解析整个文档
 * PARSECURRENT:(5)-解析当前页
 */
const MARKOPERATION = {
  NULL: -1,
  UNDO: 0,
  DELETE: 1,
  CLEAR: 2,
  CLEARALL: 3,
  PARSE: 4,
  PARSECURRENT: 5,
};

/**
 * 创建画线功能canvas
 *
 * @param {string} id canvas元素Id，便于后面获取元素
 * @param {number} width 宽度，与前一个canvas保持一致
 * @param {number} height 高度，与前一个canvas保持一致
 * @param {HTMLElement} parent 父节点，用于将canvas元素append到dom中
 * @param {EventBus} eventBus 事件总线实例
 */
function createMarkCanvas(id, width, height, parent, eventBus) {
  let oldCanvas = document.getElementById(id);
  if (oldCanvas) {
    oldCanvas.style.display = "none";
    oldCanvas = null;
  }
  let markCanvas = document.createElement("canvas");
  markCanvas.id = id;
  markCanvas.width = width;
  markCanvas.height = height;
  markCanvas.style = "position: absolute; top: 0; left: 0; z-index: 0";
  parent.appendChild(markCanvas);

  // 控制是否需要重新绘图，用于pdfjs原生动作，如缩放等
  if (document.querySelectorAll(`canvas#${id}`).length > 1) {
    eventBus.dispatch("markredraw", { source: window, canvas: markCanvas });
  }
}

export { SUPPORT_MARK, MARKTYPE, MARKOPERATION, createMarkCanvas };
