// https://github.com/WickyNilliams/headroom.js/compare/ea256161df7b183f91a9fde2d070d4f0e050024f...master

;(window => {
  const features = {
    bind: !!(function () {}.bind),
    classList: 'classList' in document.documentElement,
    rAF: !!(window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame)
  }

  window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame

  /**
   * Handles debouncing of events via requestAnimationFrame
   * @see http://www.html5rocks.com/en/tutorials/speed/animations/
   * @param {Function} callback The callback to handle whichever event
   */
  function Debouncer (callback) {
    this.callback = callback
    this.ticking = false
  }

  Debouncer.prototype = {
    constructor: Debouncer,

    /**
     * dispatches the event to the supplied callback
     * @private
     */
    update () {
      this.callback && this.callback()
      this.ticking = false
    },

    /**
     * ensures events don't get stacked
     * @private
     */
    requestTick () {
      if (this.ticking) return
      window.requestAnimationFrame(this.rafCallback || (this.rafCallback = this.update.bind(this)))
      this.ticking = true
    },

    /**
     * Attach this as the event listeners
     */
    handleEvent () {
      this.requestTick()
    }
  }
  /**
   * Check if object is part of the DOM
   * @constructor
   * @param {Object} obj element to check
   */
  function isDOMElement (obj) {
    return obj && typeof window !== 'undefined' && (obj === window || obj.nodeType)
  }

  /**
   * Helper function for extending objects
   */
  function extend (object /*, objectN ... */) {
    if (arguments.length <= 0) {
      throw new Error('Missing arguments in extend function')
    }

    const result = object || {}

    for (let i = 1; i < arguments.length; i++) {
      const replacement = arguments[i] || {}

      for (const key in replacement) {
        // Recurse into object except if the object is a DOM element
        if (typeof result[key] === 'object' && !isDOMElement(result[key])) {
          result[key] = extend(result[key], replacement[key])
        } else {
          result[key] = result[key] || replacement[key]
        }
      }
    }

    return result
  }

  /**
   * Helper function for normalizing tolerance option to object format
   */
  function normalizeTolerance (t) {
    return t === Object(t) ? t : { down: t, up: t }
  }

  /**
   * UI enhancement for fixed headers.
   * Hides header when scrolling down
   * Shows header when scrolling up
   * @constructor
   * @param {DOMElement} elem the header element
   * @param {Object} options options for the widget
   */
  function Headroom (elem, options) {
    options = extend(options, Headroom.options)

    this.lastKnownScrollY = 0
    this.elem = elem
    this.tolerance = normalizeTolerance(options.tolerance)
    this.classes = options.classes
    this.offset = options.offset
    this.scroller = options.scroller
    this.initialised = false
    this.onPin = options.onPin
    this.onUnpin = options.onUnpin
    this.onTop = options.onTop
    this.onNotTop = options.onNotTop
    this.onBottom = options.onBottom
    this.onNotBottom = options.onNotBottom
  }
  Headroom.prototype = {
    constructor: Headroom,

    /**
     * Initialises the widget
     */
    init () {
      if (!Headroom.cutsTheMustard) return

      this.debouncer = new Debouncer(this.update.bind(this))
      this.elem.classList.add(this.classes.initial)

      // defer event registration to handle browser
      // potentially restoring previous scroll position
      setTimeout(this.attachEvent.bind(this), 100)

      return this
    },

    /**
     * Unattaches events and removes any classes that were added
     */
    destroy () {
      this.initialised = false
      for (let key in this.classes) {
        this.elem.classList.remove(this.classes[key])
      }
      this.scroller.removeEventListener('scroll', this.debouncer, false)
    },

    /**
     * Attaches the scroll event
     * @private
     */
    attachEvent () {
      if (!this.initialised) {
        this.lastKnownScrollY = this.getScrollY()
        this.initialised = true
        this.scroller.addEventListener('scroll', this.debouncer, false)

        this.debouncer.handleEvent()
      }
    },

    /**
     * Unpins the header if it's currently pinned
     */
    unpin () {
      if (this.elem.classList.contains(this.classes.pinned) || !this.elem.classList.contains(this.classes.unpinned)) {
        this.elem.classList.add(this.classes.unpinned)
        this.elem.classList.remove(this.classes.pinned)
        this.onUnpin && this.onUnpin()
      }
    },

    /**
     * Pins the header if it's currently unpinned
     */
    pin () {
      if (this.elem.classList.contains(this.classes.unpinned)) {
        this.elem.classList.remove(this.classes.unpinned)
        this.elem.classList.add(this.classes.pinned)
        this.onPin && this.onPin()
      }
    },

    /**
     * Handles the top states
     */
    top () {
      if (!this.elem.classList.contains(this.classes.top)) {
        this.elem.classList.add(this.classes.top)
        this.elem.classList.remove(this.classes.notTop)
        this.onTop && this.onTop()
      }
    },

    /**
     * Handles the not top state
     */
    notTop () {
      if (!this.elem.classList.contains(this.classes.notTop)) {
        this.elem.classList.add(this.classes.notTop)
        this.elem.classList.remove(this.classes.top)
        this.onNotTop && this.onNotTop()
      }
    },

    bottom () {
      if (!this.elem.classList.contains(this.classes.bottom)) {
        this.elem.classList.add(this.classes.bottom)
        this.elem.classList.remove(this.classes.notBottom)
        this.onBottom && this.onBottom()
      }
    },

    /**
     * Handles the not top state
     */
    notBottom () {
      if (!this.elem.classList.contains(this.classes.notBottom)) {
        this.elem.classList.add(this.classes.notBottom)
        this.elem.classList.remove(this.classes.bottom)
        this.onNotBottom && this.onNotBottom()
      }
    },

    /**
     * Gets the Y scroll position
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.scrollY
     * @return {Number} pixels the page has scrolled along the Y-axis
     */
    getScrollY () {
      return (this.scroller.pageYOffset !== undefined)
        ? this.scroller.pageYOffset
        : (this.scroller.scrollTop !== undefined)
          ? this.scroller.scrollTop
          : (document.documentElement || document.body.parentNode || document.body).scrollTop
    },

    /**
     * Gets the height of the viewport
     * @see http://andylangton.co.uk/blog/development/get-viewport-size-width-and-height-javascript
     * @return {int} the height of the viewport in pixels
     */
    getViewportHeight () {
      return window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight
    },

    /**
     * Gets the physical height of the DOM element
     * @param  {Object}  elm the element to calculate the physical height of which
     * @return {int}     the physical height of the element in pixels
     */
    getElementPhysicalHeight (elm) {
      return Math.max(
        elm.offsetHeight,
        elm.clientHeight
      )
    },

    /**
     * Gets the physical height of the scroller element
     * @return {int} the physical height of the scroller element in pixels
     */
    getScrollerPhysicalHeight () {
      return (this.scroller === window || this.scroller === document.body)
        ? this.getViewportHeight()
        : this.getElementPhysicalHeight(this.scroller)
    },

    /**
     * Gets the height of the document
     * @see http://james.padolsey.com/javascript/get-document-height-cross-browser/
     * @return {int} the height of the document in pixels
     */
    getDocumentHeight () {
      return Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
      )
    },

    /**
     * Gets the height of the DOM element
     * @param  {Object}  elm the element to calculate the height of which
     * @return {int}     the height of the element in pixels
     */
    getElementHeight (elm) {
      return Math.max(elm.scrollHeight, elm.offsetHeight, elm.clientHeight)
    },

    /**
     * Gets the height of the scroller element
     * @return {int} the height of the scroller element in pixels
     */
    getScrollerHeight () {
      return (this.scroller === window || this.scroller === document.body)
        ? this.getDocumentHeight()
        : this.getElementHeight(this.scroller)
    },

    /**
     * determines if the scroll position is outside of document boundaries
     * @param  {int}  currentScrollY the current y scroll position
     * @return {bool} true if out of bounds, false otherwise
     */
    isOutOfBounds (currentScrollY) {
      return currentScrollY < 0 || currentScrollY + this.getScrollerPhysicalHeight() > this.getScrollerHeight()
    },

    /**
     * determines if the tolerance has been exceeded
     * @param  {int} currentScrollY the current scroll y position
     * @return {bool} true if tolerance exceeded, false otherwise
     */
    toleranceExceeded (currentScrollY, direction) {
      return Math.abs(currentScrollY - this.lastKnownScrollY) >= this.tolerance[direction]
    },

    /**
     * determine if it is appropriate to unpin
     * @param  {int} currentScrollY the current y scroll position
     * @param  {bool} toleranceExceeded has the tolerance been exceeded?
     * @return {bool} true if should unpin, false otherwise
     */
    shouldUnpin (currentScrollY, toleranceExceeded) {
      return currentScrollY > this.lastKnownScrollY && currentScrollY >= this.offset && toleranceExceeded
    },

    /**
     * determine if it is appropriate to pin
     * @param  {int} currentScrollY the current y scroll position
     * @param  {bool} toleranceExceeded has the tolerance been exceeded?
     * @return {bool} true if should pin, false otherwise
     */
    shouldPin (currentScrollY, toleranceExceeded) {
      return (currentScrollY < this.lastKnownScrollY && toleranceExceeded) || currentScrollY <= this.offset
    },

    /**
     * Handles updating the state of the widget
     */
    update () {
      const currentScrollY = this.getScrollY()
      const scrollDirection = currentScrollY > this.lastKnownScrollY ? 'down' : 'up'
      const toleranceExceeded = this.toleranceExceeded(currentScrollY, scrollDirection)

      if (this.isOutOfBounds(currentScrollY)) {
        // Ignore bouncy scrolling in OSX
        return
      }

      if (currentScrollY <= this.offset) {
        this.top()
      } else {
        this.notTop()
      }

      if (currentScrollY + this.getViewportHeight() >= this.getScrollerHeight()) {
        this.bottom()
      } else {
        this.notBottom()
      }

      if (this.shouldUnpin(currentScrollY, toleranceExceeded)) {
        this.unpin()
      } else if (this.shouldPin(currentScrollY, toleranceExceeded)) {
        this.pin()
      }

      this.lastKnownScrollY = currentScrollY
    }
  }
  /**
   * Default options
   * @type {Object}
   */
  Headroom.options = {
    tolerance: { up: 0, down: 0 },
    offset: 60,
    scroller: window,
    classes: {
      pinned: 'is-pinned',
      unpinned: 'is-unpinned',
      top: 'is-top',
      notTop: 'is-not-top',
      bottom: 'is-bottom',
      notBottom: 'is-not-bottom',
      initial: 'navbar'
    }
  }
  Headroom.cutsTheMustard = typeof features !== 'undefined' && features.rAF && features.bind && features.classList

  window.Headroom = Headroom
})(window)
