/**
 * Image Cropper Module
 * Handles loading, displaying, panning, zooming, and cropping images
 */
export class ImageCropper {
  /**
   * Create a new ImageCropper
   * @param {HTMLElement} container - The DOM element to contain the image editor
   * @param {Object} options - Configuration options
   * @param {number} options.aspectRatio - The fixed aspect ratio for cropping (width/height)
   * @param {number} [options.minZoom=0.1] - Minimum zoom level
   * @param {number} [options.maxZoom=5] - Maximum zoom level
   * @param {number} [options.zoomStep=0.1] - Zoom increment/decrement step
   */
  constructor(container, options = {}) {
      if (!container || !(container instanceof HTMLElement)) {
          throw new Error("Invalid container element provided.");
      }
      this.container = container;
      // Ensure container has relative or absolute positioning for absolute children
      if (getComputedStyle(this.container).position === 'static') {
          this.container.style.position = 'relative';
          console.warn("ImageCropper container position was 'static', changed to 'relative'.");
      }

      this.options = {
          aspectRatio: 8.5 / 11, // Default to letter size ratio
          minZoom: 0.1,
          maxZoom: 5,
          zoomStep: 0.1,
          ...options
      };

      // State
      this.image = null;
      this.imageLoaded = false;
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.containerRect = null; // Cached container dimensions
      this.frameRect = null; // Cached frame dimensions and position
      this.dragStart = null; // Stores drag start info {x, y, offsetX, offsetY}
      this.overlay = null; // Reference to the overlay element
      this.cropFrame = null; // Reference to the crop frame element

      // Bind event handlers to maintain 'this' context
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseUp = this.handleMouseUp.bind(this);
      this.handleWheel = this.handleWheel.bind(this);
      this.handleTouchStart = this.handleTouchStart.bind(this);
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);

      // Setup crop frame visuals
      this.setupCropFrame();

      // Initial update in case container is already sized
      this.updateCropFrame();
  }

  /**
   * Set up the crop frame UI elements (overlay and border)
   */
  setupCropFrame() {
      // Remove any existing elements first
      const existingOverlay = this.container.querySelector('.crop-overlay');
      if (existingOverlay) existingOverlay.remove();
      const existingFrame = this.container.querySelector('.crop-frame');
      if (existingFrame) existingFrame.remove();

      // Create overlay that will darken the area outside the crop frame
      this.overlay = document.createElement('div');
      this.overlay.className = 'crop-overlay';
      Object.assign(this.overlay.style, {
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          pointerEvents: 'none', // Allows interaction with elements underneath
          zIndex: '10',
          // clipPath will be set in updateCropFrame
      });

      // Create the visual crop frame border
      this.cropFrame = document.createElement('div');
      this.cropFrame.className = 'crop-frame';
      Object.assign(this.cropFrame.style, {
          position: 'absolute',
          border: '2px solid white',
          backgroundColor: 'transparent', // Make sure it's see-through
          boxSizing: 'border-box', // Border included in width/height
          pointerEvents: 'none',
          zIndex: '11', // Above overlay but below potential controls
          // Dimensions set in updateCropFrame
      });

      // Add elements to container
      this.container.appendChild(this.overlay);
      this.container.appendChild(this.cropFrame);
  }

  /**
   * Update the crop frame size and position based on container size and aspect ratio.
   * Also updates the overlay's clip-path to create the "cutout".
   */
  updateCropFrame() {
      if (!this.container || !this.cropFrame || !this.overlay) return;

      // Get current container dimensions
      this.containerRect = this.container.getBoundingClientRect();
      // Use clientWidth/Height as they exclude borders and scrollbars
      const containerWidth = this.container.clientWidth;
      const containerHeight = this.container.clientHeight;

      if (containerWidth <= 0 || containerHeight <= 0) {
           console.warn("Container has zero dimensions. Crop frame cannot be calculated.");
           this.frameRect = null; // Invalidate frame rect
           // Reset clip-path if container is invalid
           this.overlay.style.clipPath = '';
           return;
      }

      // Calculate max frame dimensions based on 90% of container space
      const availableWidth = containerWidth * 0.9;
      const availableHeight = containerHeight * 0.9;

      let frameWidth, frameHeight;

      // Determine frame size based on aspect ratio and available space
      if (availableWidth / availableHeight > this.options.aspectRatio) {
          // Container is relatively wider than the aspect ratio requires
          // Fit frame based on height
          frameHeight = availableHeight;
          frameWidth = frameHeight * this.options.aspectRatio;
      } else {
          // Container is relatively taller or matches aspect ratio
          // Fit frame based on width
          frameWidth = availableWidth;
          frameHeight = frameWidth / this.options.aspectRatio;
      }

      // Ensure dimensions are positive
      frameWidth = Math.max(0, frameWidth);
      frameHeight = Math.max(0, frameHeight);

      // Position frame in the center of the container
      // Use container clientWidth/Height for centering relative to the usable area
      const left = (containerWidth - frameWidth) / 2;
      const top = (containerHeight - frameHeight) / 2;
      const right = left + frameWidth;
      const bottom = top + frameHeight;

      // Update frame styles
      this.cropFrame.style.width = `${frameWidth}px`;
      this.cropFrame.style.height = `${frameHeight}px`;
      this.cropFrame.style.left = `${left}px`;
      this.cropFrame.style.top = `${top}px`;

      // Update the overlay's clip-path using SVG path syntax and evenodd fill-rule
      // This defines the outer rectangle (the container bounds) and the inner rectangle (the hole)
      // The evenodd rule makes the area *between* these two paths visible (the overlay)
      // and the area *inside* the inner path transparent (the hole).
      const svgPath = `M0 0 L${containerWidth} 0 L${containerWidth} ${containerHeight} L0 ${containerHeight} Z ` + // Outer rectangle (clockwise)
                      `M${left} ${top} L${left} ${bottom} L${right} ${bottom} L${right} ${top} Z`; // Inner rectangle (counter-clockwise relative to outer)
      // Note: For evenodd, the winding order (clockwise/counter-clockwise) matters.
      // Defining outer clockwise and inner counter-clockwise (or vice-versa) ensures the hole.
      // If both were clockwise, the inner path would just be overlayed.

      this.overlay.style.clipPath = `path(evenodd, '${svgPath}')`;


      // Store calculated frame coordinates relative to the container's client area
      this.frameRect = {
          left: left,
          top: top,
          width: frameWidth,
          height: frameHeight,
          right: right,
          bottom: bottom
      };

      // If image is already loaded, ensure it respects the new frame
      // This might involve re-centering or adjusting zoom slightly,
      // but for now, just update the frame visuals.
      // A more complex implementation might adjust the view if the frame changes significantly.
  }


  /**
   * Load an image file and display it.
   * @param {File} file - The image file to load.
   * @returns {Promise<void>} - Resolves when image is loaded and initially positioned.
   */
  loadImage(file) {
      return new Promise((resolve, reject) => {
          this.clear(); // Clear previous image and state

          if (!file || !file.type.startsWith('image/')) {
              return reject(new Error('Invalid file type. Please select an image file.'));
          }

          this.image = document.createElement('img');
          Object.assign(this.image.style, {
              position: 'absolute',
              top: '0', // Positioned via transform
              left: '0', // Positioned via transform
              transformOrigin: '0 0', // Crucial for scaling/panning logic
              zIndex: '5', // Ensure image is below the overlay/frame
              userSelect: 'none', // Prevent text selection during drag
              webkitUserSelect: 'none', // Safari
              msUserSelect: 'none', // IE
              MozUserSelect: 'none', // Firefox
              willChange: 'transform' // Hint browser for transform optimization
          });
          this.image.draggable = false; // Prevent native image dragging

          this.image.onload = () => {
              // Insert image *before* the overlay to ensure correct stacking order
              if (this.overlay && this.overlay.parentNode === this.container) {
                  this.container.insertBefore(this.image, this.overlay);
              } else {
                  // Fallback if overlay isn't ready (shouldn't happen)
                  this.container.appendChild(this.image);
              }

              this.imageLoaded = true;

              // Ensure container dimensions are up-to-date *before* calculating frame/view
              // Reading a layout property forces the browser to recalculate layout.
              this.container.getBoundingClientRect();

              // Calculate frame position and size based on current container dimensions
              this.updateCropFrame();

              // Position and scale the image to fit the frame initially
              this.resetView();

              // Add interaction listeners *after* image is ready
              this.setupEventListeners();
              resolve();
          };

          this.image.onerror = (err) => {
              console.error("Image loading error:", err);
              this.clear(); // Clean up on error
              reject(new Error('Failed to load image.'));
          };

          // Read the file and set image source
          const reader = new FileReader();
          reader.onload = (e) => {
              this.image.src = e.target.result;
          };
          reader.onerror = (err) => {
              console.error("File reading error:", err);
              reject(new Error('Failed to read file.'));
          };
          reader.readAsDataURL(file);
      });
  }

  /**
   * Reset the image view: Scale to fit the crop frame and center it.
   */
  resetView() {
      if (!this.imageLoaded || !this.image || !this.frameRect) {
           console.warn("Cannot reset view: Image not loaded or frame not calculated.");
           return;
      }

      // Get natural image dimensions
      const imgWidth = this.image.naturalWidth;
      const imgHeight = this.image.naturalHeight;

      // Get crop frame dimensions (already calculated in updateCropFrame)
      const frameWidth = this.frameRect.width;
      const frameHeight = this.frameRect.height;

      // Safety check for dimensions
      if (imgWidth <= 0 || imgHeight <= 0 || frameWidth <= 0 || frameHeight <= 0) {
          console.error("Cannot reset view due to invalid image or frame dimensions.");
          this.scale = 1;
          this.offsetX = 0;
          this.offsetY = 0;
          this.updateImageTransform(); // Apply default transform
          return;
      }

      // Calculate aspect ratios
      const imageAspect = imgWidth / imgHeight;
      const frameAspect = frameWidth / frameHeight; // Should match options.aspectRatio

      // --- Calculate Scale to FIT the image within the frame ---
      let scale;
      if (imageAspect > frameAspect) {
          // Image is wider than frame aspect ratio -> fit based on height
          scale = frameHeight / imgHeight;
      } else {
          // Image is taller or same aspect ratio -> fit based on width
          scale = frameWidth / imgWidth;
      }

      // --- Alternative: Calculate Scale to FILL the frame ---
      // Uncomment this block and comment the "FIT" block above if you
      // want the image to initially cover the entire frame area.
      /*
      let scale;
      if (imageAspect > frameAspect) {
          // Image is wider than frame aspect ratio. To fill, must match frame width.
          scale = frameWidth / imgWidth;
      } else {
          // Image is taller or same aspect ratio. To fill, must match frame height.
          scale = frameHeight / imgHeight;
      }
      // Or more concisely for FILL:
      // const scaleToFillWidth = frameWidth / imgWidth;
      // const scaleToFillHeight = frameHeight / imgHeight;
      // scale = Math.max(scaleToFillWidth, scaleToFillHeight);
      */

      // Apply calculated scale, respecting zoom limits if needed (optional here)
      // this.scale = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, scale));
      this.scale = scale; // Use the calculated fit/fill scale directly for reset

      // Calculate scaled dimensions
      const scaledWidth = imgWidth * this.scale;
      const scaledHeight = imgHeight * this.scale;

      // Calculate the center point of the frame (relative to the container's top-left)
      const frameCenterX = this.frameRect.left + frameWidth / 2;
      const frameCenterY = this.frameRect.top + frameHeight / 2;

      // Calculate the required top-left offset (offsetX, offsetY) for the image's transform.
      // We want the center of the scaled image (offsetX + scaledWidth / 2, offsetY + scaledHeight / 2)
      // to align with the center of the frame (frameCenterX, frameCenterY).
      // Solving for offsetX: offsetX = frameCenterX - scaledWidth / 2
      // Solving for offsetY: offsetY = frameCenterY - scaledHeight / 2
      this.offsetX = frameCenterX - scaledWidth / 2;
      this.offsetY = frameCenterY - scaledHeight / 2;

      // Apply the initial transform
      this.updateImageTransform();

      // console.log(`Reset View: Scale=${this.scale.toFixed(3)}, Offset=(${this.offsetX.toFixed(1)}, ${this.offsetY.toFixed(1)})`);
  }

  /**
   * Apply current transform (pan and zoom) values to the image element.
   */
  updateImageTransform() {
      if (!this.image) return;
      // Use translate for panning and scale for zooming.
      // Rounding offsets can sometimes prevent sub-pixel rendering issues, but might feel less smooth.
      // this.image.style.transform = `translate(${Math.round(this.offsetX)}px, ${Math.round(this.offsetY)}px) scale(${this.scale})`;
      this.image.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
  }

  /**
   * Set up mouse and touch event listeners for panning and zooming.
   */
  setupEventListeners() {
      // Remove existing listeners first to prevent duplicates
      this.removeEventListeners();

      // Mouse events
      this.container.addEventListener('mousedown', this.handleMouseDown);
      this.container.addEventListener('wheel', this.handleWheel, { passive: false }); // Need preventDefault for zoom

      // Touch events
      this.container.addEventListener('touchstart', this.handleTouchStart, { passive: false }); // Need preventDefault for pan/zoom
      // Add move/end listeners to the document/window to capture drags outside the container
      // These are added dynamically during the interaction (in handleMouseDown/handleTouchStart)
  }

  /**
  * Remove event listeners
  */
  removeEventListeners() {
      this.container.removeEventListener('mousedown', this.handleMouseDown);
      this.container.removeEventListener('wheel', this.handleWheel);
      this.container.removeEventListener('touchstart', this.handleTouchStart);

      // Remove document listeners just in case they were left hanging
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      document.removeEventListener('touchmove', this.handleTouchMove);
      document.removeEventListener('touchend', this.handleTouchEnd);
  }


  // --- Event Handlers ---

  handleMouseDown(e) {
      if (!this.imageLoaded || e.button !== 0) return; // Only main button
      e.preventDefault(); // Prevent text selection, etc.

      this.dragStart = {
          x: e.clientX,
          y: e.clientY,
          offsetX: this.offsetX, // Store initial offset at drag start
          offsetY: this.offsetY
      };

      // Add move/up listeners to the document to track movement anywhere
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp, { once: true }); // Remove listener after mouseup
  }

  handleMouseMove(e) {
      if (!this.dragStart) return;
      e.preventDefault();

      // Calculate distance dragged
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;

      // Update offset based on drag distance
      this.offsetX = this.dragStart.offsetX + dx;
      this.offsetY = this.dragStart.offsetY + dy;

      this.updateImageTransform();
  }

  handleMouseUp(e) {
      if (!this.dragStart) return;
      e.preventDefault();
      this.dragStart = null; // Clear drag state

      // Remove document listeners
      document.removeEventListener('mousemove', this.handleMouseMove);
      // mouseup listener already removed via { once: true }
  }

  handleWheel(e) {
      if (!this.imageLoaded) return;
      e.preventDefault(); // Prevent page scrolling

      // Determine zoom factor (normalize deltaY across browsers)
      const delta = -Math.sign(e.deltaY) * this.options.zoomStep;
      const zoomFactor = 1 + delta;

      // Zoom relative to the cursor position
      this.zoomAtPoint(zoomFactor, e.clientX, e.clientY);
  }

  handleTouchStart(e) {
      if (!this.imageLoaded) return;
      // Handle single touch for panning
      if (e.touches.length === 1) {
           e.preventDefault(); // Prevent default touch actions like scrolling
           const touch = e.touches[0];
           this.dragStart = {
               x: touch.clientX,
               y: touch.clientY,
               offsetX: this.offsetX,
               offsetY: this.offsetY
           };
           // Add touch move/end listeners to the document
           document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
           document.addEventListener('touchend', this.handleTouchEnd, { once: true });
      }
      // Basic pinch-zoom could be added here by tracking e.touches.length === 2
  }

   handleTouchMove(e) {
      if (!this.dragStart || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];

      // Calculate drag distance
      const dx = touch.clientX - this.dragStart.x;
      const dy = touch.clientY - this.dragStart.y;

      // Update offset
      this.offsetX = this.dragStart.offsetX + dx;
      this.offsetY = this.dragStart.offsetY + dy;

      this.updateImageTransform();
  }

  handleTouchEnd(e) {
      if (!this.dragStart) return;
      // Don't prevent default here, allows potential tap events later
      this.dragStart = null;

      // Remove document listeners
      document.removeEventListener('touchmove', this.handleTouchMove);
      // touchend listener removed via { once: true }
  }


  // --- Zoom and Pan Methods ---

  /**
   * Zoom the image by a given factor, centered around a specific point.
   * @param {number} factor - The zoom factor (e.g., 1.1 for 10% zoom in).
   * @param {number} clientX - The client X coordinate of the zoom center.
   * @param {number} clientY - The client Y coordinate of the zoom center.
   */
  zoomAtPoint(factor, clientX, clientY) {
      if (!this.imageLoaded || !this.containerRect) return;

      // Calculate the point coordinates relative to the container's top-left corner
      const pointX = clientX - this.containerRect.left;
      const pointY = clientY - this.containerRect.top;

      // Calculate the point coordinates relative to the image's top-left corner (before scaling)
      const imageX = (pointX - this.offsetX) / this.scale;
      const imageY = (pointY - this.offsetY) / this.scale;

      // Calculate the new scale, clamped within min/max limits
      const newScale = Math.max(
          this.options.minZoom,
          Math.min(this.options.maxZoom, this.scale * factor)
      );

      // If scale didn't change (due to limits), do nothing
      if (newScale === this.scale) return;

      // Calculate the new offset needed to keep the zoom point stationary on screen.
      // The new position of the image point (imageX, imageY) after scaling should be
      // such that it still aligns with the screen point (pointX, pointY).
      // newOffsetX + imageX * newScale = pointX  => newOffsetX = pointX - imageX * newScale
      // newOffsetY + imageY * newScale = pointY  => newOffsetY = pointY - imageY * newScale
      this.offsetX = pointX - imageX * newScale;
      this.offsetY = pointY - imageY * newScale;
      this.scale = newScale;

      this.updateImageTransform();
  }

  /**
   * Zoom in by a fixed step, centered on the crop frame center.
   */
  zoomIn() {
      if (!this.imageLoaded || !this.frameRect) return;
      const centerX = this.containerRect.left + this.frameRect.left + this.frameRect.width / 2;
      const centerY = this.containerRect.top + this.frameRect.top + this.frameRect.height / 2;
      this.zoomAtPoint(1 + this.options.zoomStep, centerX, centerY);
  }

  /**
   * Zoom out by a fixed step, centered on the crop frame center.
   */
  zoomOut() {
      if (!this.imageLoaded || !this.frameRect) return;
      const centerX = this.containerRect.left + this.frameRect.left + this.frameRect.width / 2;
      const centerY = this.containerRect.top + this.frameRect.top + this.frameRect.height / 2;
      this.zoomAtPoint(1 / (1 + this.options.zoomStep), centerX, centerY); // Use inverse factor for zooming out
  }

  /**
   * Pan the image by a specific amount.
   * @param {number} deltaX - Amount to pan horizontally (positive moves right).
   * @param {number} deltaY - Amount to pan vertically (positive moves down).
   */
  panImage(deltaX, deltaY) {
      if (!this.imageLoaded) return;
      this.offsetX += deltaX;
      this.offsetY += deltaY;
      this.updateImageTransform();
  }

  // --- Cropping ---

  /**
   * Get the cropped image data as a Base64 encoded Data URL.
   * @param {string} [format='image/jpeg'] - The desired output format.
   * @param {number} [quality=0.92] - Quality for lossy formats (e.g., JPEG).
   * @param {number} [outputWidth=850] - Desired width of the output cropped image (maintains aspect ratio).
   * @returns {string | null} - Base64 Data URL of the cropped image, or null if not possible.
   */
  getCroppedImage(format = 'image/jpeg', quality = 0.92, outputWidth = 850) {
      if (!this.imageLoaded || !this.image || !this.frameRect) {
          console.error("Cannot crop: Image not loaded or frame not calculated.");
          return null;
      }

      // Calculate output dimensions based on desired width and fixed aspect ratio
      const outputHeight = outputWidth / this.options.aspectRatio;

      // Create a canvas for drawing the cropped section
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(outputWidth);
      canvas.height = Math.round(outputHeight);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
           console.error("Failed to get 2D context from canvas.");
           return null;
      }

      // Calculate the source rectangle (part of the *original* image)
      // that corresponds to the area visible within the crop frame.

      // 1. Frame position relative to the container (top-left corner)
      const frameX_container = this.frameRect.left;
      const frameY_container = this.frameRect.top;

      // 2. Image's top-left position relative to the container (current transform)
      const imageX_container = this.offsetX;
      const imageY_container = this.offsetY;

      // 3. Frame's top-left position relative to the *scaled* image's top-left
      const frameX_scaledImg = frameX_container - imageX_container;
      const frameY_scaledImg = frameY_container - imageY_container;

      // 4. Convert frame position and dimensions from screen pixels (scaled)
      //    back to original image pixels by dividing by the current scale.
      const sourceX = frameX_scaledImg / this.scale;
      const sourceY = frameY_scaledImg / this.scale;
      const sourceWidth = this.frameRect.width / this.scale;
      const sourceHeight = this.frameRect.height / this.scale;

      // 5. Draw the calculated portion of the original image onto the canvas.
      //    The `drawImage` function takes:
      //    image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
      try {
           ctx.drawImage(
               this.image,
               sourceX,                // Source X (from original image)
               sourceY,                // Source Y (from original image)
               sourceWidth,            // Source Width (from original image)
               sourceHeight,           // Source Height (from original image)
               0,                      // Destination X (on canvas)
               0,                      // Destination Y (on canvas)
               canvas.width,           // Destination Width (on canvas)
               canvas.height           // Destination Height (on canvas)
           );
      } catch (error) {
          console.error("Error drawing image to canvas:", error);
          // This can happen if source coordinates/dimensions are invalid
          return null;
      }


      // 6. Convert the canvas content to a Data URL
      try {
          return canvas.toDataURL(format, quality);
      } catch (error) {
          console.error("Error converting canvas to Data URL:", error);
          // This can happen with tainted canvases (CORS issues) if loading external images
          return null;
      }
  }

  // --- Utility and Cleanup ---

  /**
   * Get the current image element being used.
   * @returns {HTMLImageElement | null} - The image element or null.
   */
  getImage() {
      return this.image;
  }

  /**
   * Clear the current image, reset state, and remove listeners.
   */
  clear() {
      // Remove event listeners
      this.removeEventListeners();

      // Remove image element from DOM
      if (this.image && this.image.parentNode) {
          this.image.parentNode.removeChild(this.image);
      }

      // Reset state variables
      this.image = null;
      this.imageLoaded = false;
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.dragStart = null;
      // Keep containerRect and frameRect as they might still be relevant
      // or will be recalculated by updateCropFrame if needed.

      // Optionally reset the crop frame visuals (e.g., hide it or reset overlay)
      if (this.overlay) {
          this.overlay.style.clipPath = ''; // Reset clip path on clear
      }
      // this.updateCropFrame(); // Or specific logic to hide/reset frame appearance
  }

  /**
   * Clean up all resources and listeners associated with the cropper.
   * Call this when the cropper is no longer needed.
   */
  destroy() {
      this.clear(); // Clear image and listeners

      // Remove frame elements
       if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
      }
       if (this.cropFrame && this.cropFrame.parentNode) {
          this.cropFrame.parentNode.removeChild(this.cropFrame);
      }

      // Nullify references
      this.container = null;
      this.options = null;
      this.overlay = null;
      this.cropFrame = null;
      this.containerRect = null;
      this.frameRect = null;
  }
}
