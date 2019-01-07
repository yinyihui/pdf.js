import { getGlobalEventBus, NullL10n } from "../ui_utils";

const MARKTYPE = {
  NULL: -1,
  HLINE: 0,
  VLINE: 1,
  AREA: 2,
};

class PDFMarkBar {
  constructor(options, eventBus = getGlobalEventBus(), l10n = NullL10n) {
    this.opened = false;
    this.markType = null;
    this.marks = [];

    this.pdfViewer = options.pdfViewer || null;
    this.bar = options.bar || null;
    this.toggleButton = options.toggleButton || null;
    this.markHLine = options.markHLine || null;
    this.markVLine = options.markVLine || null;
    this.markArea = options.markArea || null;
    this.undoMark = options.undoMark || null;
    this.delete = options.delete || null;
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

    this.markHLine.addEventListener("click", () => {
      this.select(MARKTYPE.HLINE);
    });

    this.markVLine.addEventListener("click", () => {
      this.select(MARKTYPE.VLINE);
    });

    this.markArea.addEventListener("click", () => {
      this.select(MARKTYPE.AREA);
    });

    this.undoMark.addEventListener("click", () => {});

    this.delete.addEventListener("click", () => {});
    
    this.clearAll.addEventListener("click", () => {});

    this.parse.addEventListener("click", () => {
      this.select(MARKTYPE.NULL);
    });

    this.parseCurrent.addEventListener("click", () => {
      this.select(MARKTYPE.NULL);
    });

    this.eventBus.on("resize", this._adjustWidth.bind(this));
    this.eventBus.on("forcemarkbarclose", this.close.bind(this));
  }

  open() {
    if (!this.opened) {
      this.opened = true;
      this.toggleButton.classList.add("toggled");
      this.bar.classList.remove("hidden");
    }
    this.markHLine.focus();
    this._adjustWidth();
    this.eventBus.dispatch("forcefindbarclose", { source: window });
  }

  close() {
    if (!this.opened) {
      return;
    }
    this.opened = false;
    this.toggleButton.classList.remove("toggled");
    this.bar.classList.add("hidden");
  }

  toggle() {
    if (this.opened) {
      this.close();
    } else {
      this.open();
    }
  }

  select(markType) {
    for (let i = 0; i < 3; i++) {
      this.bar.children[i].classList.remove("toggled");
    }
    if (markType > -1) {
      this.markType = markType;
      this.bar.children[markType].classList.add("toggled");
    }
  }

  /**
   * @private
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
