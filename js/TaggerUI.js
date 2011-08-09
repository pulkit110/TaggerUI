/*
Copyright 2011 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global window, alert, prompt, fluid_1_4:true, jQuery*/

// JSLint options
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_4 = fluid_1_4 || {};

/*************
 * Tagger UI *
 *************/

(function ($, fluid) {

	/**
	 * Setup a new annotation
	 */
	var setupAnnotation = function (annotation) {
		annotation.x = 0;
		annotation.y = 0;
		annotation.w = 1; // default width and height?
		annotation.h = 1;
		annotation.tag = "default tag";
	};
	/**
	 * Instantiates a new annotation component.
	 *
	 * @param {Object} options configuration options for the component.
	 */
	fluid.defaults("fluid.annotation", {
		gradeNames: ["fluid.littleComponent", "autoInit"],
		postInitFunction: "fluid.annotation.postInit",
		strokeStyle: 'white'
	});

	fluid.annotation.postInit = function (that) {
		setupAnnotation(that);

		that.draw = function (context, isFilled) {
			context.fillStyle = that.options.fillStyle;
			context.strokeStyle = that.options.strokeStyle;
			// We can skip the drawing of elements that have moved off the screen:
			if (that.x > that.WIDTH || that.y > that.HEIGHT) {
				return;
			}
			if (that.x + that.w < 0 || that.y + that.h < 0) {
				return;
			}
			if (isFilled) {
				context.fillRect(that.x, that.y, that.w, that.h);
			} else {
				context.strokeRect(that.x, that.y, that.w, that.h);
			}
		};
	};
	//Initialize a new Annotation and add it
	var addAnnotation = function (x, y, w, h, tag, that) {
		var newAnnotation = fluid.annotation({
			fillStyle: that.options.fillStyle,
			strokeStyle: that.options.strokeStyle
		});
		newAnnotation.x = x;
		newAnnotation.y = y;
		newAnnotation.w = w;
		newAnnotation.h = h;
		newAnnotation.tag = tag;
		that.annotationList.push(newAnnotation);
	};
	/**
	 * Draws the outline of all annotations
	 */
	var drawAllAnnotations = function (that, isFilled) {
		var l = that.annotationList.length;
		for (var i = 0; i < l; i++) {
			that.annotationList[i].draw(that.context, isFilled);
		}
	};
	/**
	 * Update the offseet for determining mouse location
	 */
	var updateOffset = function (that) {
		var element = that.canvas;
		that.offsetX = 0;
		that.offsetY = 0;

		if (element.offsetParent) {
			do {
				that.offsetX += element.offsetLeft;
				that.offsetY += element.offsetTop;
				element = element.offsetParent;
			} while (element);
		}

		// Add padding and border style widths to offset
		that.offsetX += that.stylePaddingLeft;
		that.offsetY += that.stylePaddingTop;
		that.offsetX += that.styleBorderLeft;
		that.offsetY += that.styleBorderTop;
	};
	/**
	 * Sets mx,my to the mouse position relative to the canvas
	 */
	var getMouse = function (that, e) {
		updateOffset(that);
		that.mx = e.pageX - that.offsetX;
		that.my = e.pageY - that.offsetY;
	};
	/**
	 * Draw Image on the cavnas.
	 */
	var drawImage = function (imageCanvasContext, image, resizeFactor, imageX, imageY) {
		imageCanvasContext.drawImage(image, imageX, imageY, image.width / resizeFactor, image.height / resizeFactor);
	};
	/**
	 * The main function that draws all the stuff on canvas
	 */
	var mainDraw = function (that, x, y, w, h) {
		that.context.clearRect(0, 0, that.canvas.width, that.canvas.height);
		drawImage(that.context, that.image, that.resizeFactor, that.imageX, that.imageY);
		if (!w || !h) {
			return;
		}
		that.context.strokeRect(x, y, w, h);
	};
	/**
	 * Remove any previously highlighted annotations.
	 */
	var removePreviousAnnotation = function (that) {
		if (that.currentAnnotation) {
			that.container.get()[0].removeChild(that.currentAnnotation);
			that.currentAnnotation = false;
		}
		if (that.annotationRemoveButton) {
			that.container.get()[0].removeChild(that.annotationRemoveButton);
			that.annotationRemoveButton = false;
		}
	};
	/**
	 * Draw the background on canvas. This includes clearing the canvas and drawing the background image.
	 */
	var drawBackground = function (that) {
		that.context.clearRect(0, 0, that.canvas.width, that.canvas.height);
		drawImage(that.context, that.image, that.resizeFactor, that.imageX, that.imageY);
	};
	/**
	 * Updates the current annotation height. Called when the cropper component is used to resize the annotation.
	 */
	var updateAnnotationHeight = function (that, newHeight) {
		that.events.onChangeHeight.fire(newHeight);
	};
	/**
	 * Updates the current annotation width. Called when the cropper component is used to resize the annotation.
	 */
	var updateAnnotationWidth = function (that, newWidth) {
		that.events.onChangeWidth.fire(newWidth);
	};
	/**
	 * Updates the current annotation x coordinate. Called when the cropper component is used to resize the annotation.
	 */
	var updateAnnotationLocationX = function (that, newLocationX) {
		that.events.onChangeLocationX.fire(newLocationX);
	};
	/**
	 * Updates the current annotation y coordinate. Called when the cropper component is used to resize the annotation.
	 */
	var updateAnnotationLocationY = function (that, newLocationY) {
		that.events.onChangeLocationY.fire(newLocationY);
	};
	/**
	 * Instantiates a new TaggerUI component.
	 *
	 * @param {Object} container the DOM element in which the TaggerUI lives
	 * @param {Object} options configuration options for the component.
	 */
	fluid.defaults("fluid.taggerUI", {
		gradeNames: ["fluid.viewComponent", "autoInit"],
		postInitFunction: "fluid.taggerUI.postInit",
		styles: {
			remove: "fl-image-editor-annotation-action-remove"
		},
		status: {
			remove: "Press Delete key to remove annotation"
		},
		events: {
			onAnnotationNbChange: null,
			onAnnotationAdd: null,
			onAnnotationRemove: null,
			onChangeHeight: null,
			onChangeWidth: null,
			onChangeLocationX: null,
			onChangeLocationY: null
		},
		lineWidth: 1,
		strokeStyle: 'white',
		fillStyle: 'rgba(255,255,255,0.4)',
		blurColor: 'rgba(255,255,255,0.4)'
	});

	fluid.taggerUI.postInit = function (that) {

		that.annotationList = [];	// Annotation list that stores all the annotations.

		/**
		 * Mouse handler for building tags.
		 */
		var taggerMouseDown = function (e) {
			getMouse(that, e);

			that.taggerStarted = true;
			that.tagX = that.mx;
			that.events.onChangeLocationX.fire(that.tagX);
			that.tagY = that.my;
			that.events.onChangeLocationY.fire(that.tagY);
		};
		/**
		 * Mouse handler for building tags.
		 */
		var taggerMouseMove = function (e) {

			if (!that.taggerStarted) {
				return;
			}
			getMouse(that, e);

			var x = Math.min(that.mx, that.tagX);
			that.events.onChangeLocationX.fire(x);
			var y = Math.min(that.my, that.tagY);
			that.events.onChangeLocationY.fire(y);
			var w = Math.abs(that.mx - that.tagX);
			that.events.onChangeWidth.fire(w);

			var h = Math.abs(that.my - that.tagY);
			that.events.onChangeHeight.fire(h);

			mainDraw(that, x, y, w, h);
		};
		/**
		 * Mouse handler for building tags.
		 */
		var taggerMouseUp = function (e) {
			getMouse(that, e);
			if (that.taggerStarted) {
				that.tagH = that.my - that.tagY;
				that.tagW = that.mx - that.tagX;
				that.cropper.init(that.canvas, that.resizeFactor, that.image, that.imageX, that.imageY, that.tagX, that.tagY, that.tagW, that.tagH);
			}
		};
		/**
		 * Function to remove an annotation
		 * @param i - index of the annotation to be removed.
		 */
		var removeAnnotation = function (i) {
			that.annotationList.splice(i, 1);
			that.events.onAnnotationRemove.fire(i);
			that.events.onAnnotationNbChange.fire(that.annotationList.length, that.annotationList.length + 1);
			$(that.canvas).mousemove();
		};
		/**
		 * Creates the cross button shown on highlighted annotation.
		 */
		var createCrossButton = function (box, index) {
			that.annotationRemoveButton = document.createElement("button");
			that.annotationRemoveButton.style.position = 'absolute';
			that.annotationRemoveButton.style.top = that.offsetY + box.y + "px";
			that.annotationRemoveButton.style.left = that.offsetX + box.x + box.w - 20 + "px";
			that.annotationRemoveButton.className += ' annotation';
			that.annotationRemoveButton.className += ' fl-tagger-annotation-action-remove';

			that.annotationRemoveButton.onclick = function () {
				removeAnnotation(index);
			};
			return that.annotationRemoveButton;
		};
		/**
		 * Highlights the annotation at index i
		 * @param i - the index of annotation.
		 */
		var showAnnotationAt = function (i) {
			// Remove previously shown annotation (important when two annotations overlap)
			removePreviousAnnotation(that);

			// Show annotation on mouse over
			that.currentAnnotation = document.createElement("div");
			that.currentAnnotation.style.position = 'absolute';
			that.currentAnnotation.style.top = (that.offsetY + that.annotationList[i].y) + "px";
			that.currentAnnotation.style.left = (that.offsetX + that.annotationList[i].x) + "px";
			that.currentAnnotation.style.width = that.annotationList[i].w + 'px';
			that.currentAnnotation.style.lineHeight = that.annotationList[i].h + 'px';
			that.currentAnnotation.className += ' fl-tagger-annotation';

			that.currentAnnotation.innerHTML = that.annotationList[i].tag;

			//Create cross button
			that.annotationRemoveButton = createCrossButton(that.annotationList[i], i);

			that.container.get()[0].appendChild(that.currentAnnotation);
			that.container.get()[0].appendChild(that.annotationRemoveButton);
		};
		/**
		 * Mouse handler for displaying already existing tags/annotations.
		 */
		var annotatedMouseMove = function (e) {
			getMouse(that, e);

			var l = that.annotationList.length;
			var i = 0;
			for (i = 0; i < l; i++) {
				if (that.mx > that.annotationList[i].x && that.mx < that.annotationList[i].x + that.annotationList[i].w &&  that.my > that.annotationList[i].y && that.my < that.annotationList[i].y + that.annotationList[i].h) {
					if (i !== that.previousAnnotationIndex) {
						that.previousAnnotationIndex = i;
						drawBackground(that);
						drawAllAnnotations(that, false);
						that.annotationList[i].draw(that.context, true);
						showAnnotationAt(i);
					}
					break;
				}
			}

			if (i === l && that.previousAnnotationIndex !== -1) {
				drawBackground(that);
				drawAllAnnotations(that, false);
				that.previousAnnotationIndex = -1;
				removePreviousAnnotation(that);
			}
		};
		var bindComponentEvents = function (that) {
			that.cropper.events.onChangeHeight.addListener(function (newHeight) {
				updateAnnotationHeight(that, newHeight);
			});
			that.cropper.events.onChangeWidth.addListener(function (newWidth) {
				updateAnnotationWidth(that, newWidth);
			});
			that.cropper.events.onChangeLocationX.addListener(function (newLocationX) {
				updateAnnotationLocationX(that, newLocationX);
			});
			that.cropper.events.onChangeLocationY.addListener(function (newLocationY) {
				updateAnnotationLocationY(that, newLocationY);
			});
		};
		/**
		 * Initializes a TaggerUI component. Should be called each time the user wants the tagging to start.
		 */
		that.init = function (canvas, resizeFactor, image, imageX, imageY) {

			that.canvas = canvas.get()[0];
			that.context = that.canvas.getContext('2d');
			that.resizeFactor = resizeFactor;
			that.image = image;
			that.imageX = imageX;
			that.imageY = imageY;
			that.taggerStarted = false;
			that.WIDTH = that.canvas.width;
			that.HEIGHT = that.canvas.height;
			that.previousAnnotationIndex = -1;

			removePreviousAnnotation(that); //Remove any previously shown annotations.
			that.currentAnnotation = false;
			that.annotationRemoveButton = false;

			that.cropper = fluid.cropperUI(that.container);
			bindComponentEvents(that);

			that.context.strokeStyle = that.options.strokeStyle;
			that.context.lineWidth = that.options.lineWidth;

			//fixes a problem where double clicking causes text to get selected on the canvas
			that.canvas.onselectstart = function () {
				return false;
			};
			// fixes mouse co-ordinate problems when there's a border or padding
			// see getMouse for more detail
			if (document.defaultView && document.defaultView.getComputedStyle) {
				that.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(that.canvas, null).paddingLeft, 10)     || 0;
				that.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(that.canvas, null).paddingTop, 10)      || 0;
				that.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(that.canvas, null).borderLeftWidth, 10) || 0;
				that.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(that.canvas, null).borderTopWidth, 10)  || 0;
			}

			// Attach the mousedown, mousemove and mouseup event listeners.
			that.canvas.onmousedown = taggerMouseDown;
			that.canvas.onmouseup = taggerMouseUp;
			that.canvas.onmousemove = taggerMouseMove;
		};
		/**
		 * Function that activates the keyboard accessibility features for cropperUI
		 */
		that.activateKeyboardAccessibility = function () {
			if (that.cropper !== null) {
				that.cropper.activateKeyboardAccessibility();
			}
		};
		/**
		 * Reset a taggerUI component.
		 * Removes all the existing tags.
		 */
		that.reset = function () {
			if (that.annotationList) {
				var oldLength = that.annotationList.length;
				that.annotationList = [];
				that.events.onAnnotationNbChange.fire(that.annotationList.length, oldLength);
			}
			if (that.canvas) {
				that.canvas.onmousedown = null;
				that.canvas.onmouseup = null;
				that.canvas.onmousemove = null;
			}

		};
		/**
		 * Confirm the addition of tag. Adds the new tag to the list.
		 * Also performs cleanup and redraws the background.
		 */
		that.confirmTagAdd = function (tagText) {
			var croppingReturnValues = that.cropper.reset(true);
			var tagDimensions = croppingReturnValues[1];
			that.tagX = tagDimensions.x;
			that.tagY = tagDimensions.y;
			that.tagW = tagDimensions.w;
			that.tagH = tagDimensions.h;
			that.tagText = tagText;

			if (that.tagH < 0) {
				that.tagY = that.my;
				that.tagH = -that.tagH;
			}
			if (that.tagW < 0) {
				that.tagX = that.mx;
				that.tagW = -that.tagW;
			}
			addAnnotation(that.tagX, that.tagY, that.tagW, that.tagH, that.tagText, that);
			that.events.onAnnotationAdd.fire(that.annotationList[that.annotationList.length - 1].tag);
			that.events.onAnnotationNbChange.fire(that.annotationList.length, that.annotationList.length - 1);
			removePreviousAnnotation(that);
			// Clear the canvas and draw image on canvas
			drawBackground(that);
		};
		/**
		 * Delete tag at gicen index.
		 * @param index - the index of tag to be deleted.
		 */
		that.deleteTag = function (index) {
			removeAnnotation(index);
		};
		/**
		 * Indicate the completion of a tagging session.
		 * Doesn't affect the given tags. Just performs cleanup and redraws the background.
		 * If you want to reset the tagger component and delete all the existing tags, use reset instead.
		 */
		that.doneTagging = function () {
			if (that.cropper !== null) {
				that.cropper.reset(true);
			}
			if (that.canvas) {
				that.canvas.onmousedown = null;
				that.canvas.onmouseup = null;
				that.canvas.onmousemove = null;
				drawBackground(that);
			}
		};
		/**
		 * Show all the annotations. Also associate the mouse handlers for annotations.
		 */
		that.showAnnotations = function () {
			drawBackground(that);
			drawAllAnnotations(that, false);
			that.canvas.onmousemove = annotatedMouseMove;
		};
		/**
		 * Hides all the annotations and unbinds the mouse handlers.
		 */
		that.hideAnnotations = function () {
			drawBackground(that);
			that.canvas.onmousemove = null;
		};
		/**
		 * Highlight the annotation/tag at index i
		 * @param i- index of the annotation to be highlighted.
		 */
		that.highlightTag = function (i) {
			updateOffset(that);
			if (i < that.annotationList.length) {
				that.previousAnnotationIndex = i;
				drawBackground(that);
				drawAllAnnotations(that, false);

				that.annotationList[i].draw(that.context, true);
				showAnnotationAt(i);
			}
		};
		/**
		 * Removes all existing highlights.
		 */
		that.removeHighlights = function () {
			removePreviousAnnotation(that);
			that.showAnnotations();
		};
		/**
		 * Returns the number of annotations.
		 */
		that.getNbAnnotations = function () {
			if (that.annotationList) {
				return that.annotationList.length;
			}
			return 0;
		};
		/**
		 * Returns the complete list of all the tags.
		 */
		that.getTagList = function () {
			var tagList = new Array(that.annotationList.length);
			for (var i = 0; i < that.annotationList.length; ++i) {
				tagList[i] = that.annotationList[i].tag;
			}
			return tagList;
		};
		/**
		 * Set the x coordinate of current tag.
		 */
		that.setLocationX = function (newLocationX) {
			that.tagX = newLocationX;
			if (!that.taggerStarted) {
				that.cropper.init(that.canvas, that.resizeFactor, that.image, that.imageX, that.imageY, that.tagX, that.tagY, that.tagW, that.tagH);
				that.taggerStarted = true;
			}
			return that.cropper.setLocationX(newLocationX);
		};
		/**
		 * Set the y coordinate of current tag.
		 */
		that.setLocationY = function (newLocationY) {
			that.tagY = newLocationY;
			if (!that.taggerStarted) {
				that.cropper.init(that.canvas, that.resizeFactor, that.image, that.imageX, that.imageY, that.tagX, that.tagY, that.tagW, that.tagH);
				that.taggerStarted = true;
			}
			return that.cropper.setLocationY(newLocationY);
		};
		/**
		 * Set the width of current tag.
		 */
		that.setWidth = function (newWidth, isFixedRatioOn) {
			that.tagW = newWidth;
			if (!that.taggerStarted) {
				that.cropper.init(that.canvas, that.resizeFactor, that.image, that.imageX, that.imageY, that.tagX, that.tagY, that.tagW, that.tagH);
				that.taggerStarted = true;
			}
			return that.cropper.setWidth(newWidth, false);
		};
		/**
		 * Set the height of current tag.
		 */
		that.setHeight = function (newHeight, isFixedRatioOn) {
			that.tagH = newHeight;
			if (!that.taggerStarted) {
				that.cropper.init(that.canvas, that.resizeFactor, that.image, that.imageX, that.imageY, that.tagX, that.tagY, that.tagW, that.tagH);
				that.taggerStarted = true;
			}
			return that.cropper.setHeight(newHeight, false);
		};
		/**
		 * Function that automatically adjusts tags when the image has been resized.
		 * It automatically reduces/increases the size of the tags to reflect the new size.
		 * @param newW - new width of the image.
		 * @param newH - new height of the image.
		 * @param resizeFactor - the ratio by which the image has been resized to fit the canvas
		 * @param image - the new resized image
		 * @param imageX - the new starting x coordinate of image
		 * @param imageY - the new starting y coordinate of image
		 */
		that.adjustTagsForResize = function (newW, newH, resizeFactor, image, imageX, imageY) {
			that.image = image;
			that.resizeFactor = resizeFactor;
			that.imageX = imageX;
			that.imageY = imageY;

			var l = that.annotationList.length;
			var i = 0;
			for (i = 0; i < l; i++) {
				that.annotationList[i].w *= newW / that.WIDTH;
				that.annotationList[i].h *= newH / that.HEIGHT;
				that.annotationList[i].x *= newW / that.WIDTH;
				that.annotationList[i].y *= newH / that.HEIGHT;
			}

			that.HEIGHT = newH;
			that.WIDTH = newW;
		};
		/**
		 * Function that automatically adjusts tags when the image has been cropped.
		 * It automatically discards all the tags that were outside the cropping dimensions.
		 * @param newW - new width of the image.
		 * @param newH - new height of the image.
		 * @param resizeFactor - the ratio by which the image has been resized to fit the canvas
		 * @param image - the new resized image
		 * @param imageX - the new starting x coordinate of image
		 * @param imageY - the new starting y coordinate of image
		 * @param croppingDimensions - an object that stores the dimensions of the cropping bounding box. This should contain 4 fields:
		 * 									x - the x coordinate of the bounding box
		 * 									y - the y coordinate of the bounding box
		 * 									w - the width of the bounding box
		 * 									h - the height of the bounding box
		 */
		that.adjustTagsForCrop = function (newW, newH, resizeFactor, image, imageX, imageY, croppingDimensions) {
			that.image = image;
			that.resizeFactor = resizeFactor;
			that.imageX = imageX;
			that.imageY = imageY;
			var oldLength = that.annotationList.length;
			var l = that.annotationList.length;
			var i = 0;
			for (i = 0; i < l; i++) {
				if (that.annotationList[i].x >= croppingDimensions.x && that.annotationList[i].x + that.annotationList[i].w <= croppingDimensions.x + croppingDimensions.w &&
						that.annotationList[i].y >= croppingDimensions.y && that.annotationList[i].y + that.annotationList[i].h <= croppingDimensions.y + croppingDimensions.h) {
					that.annotationList[i].w *= newW / croppingDimensions.w;
					that.annotationList[i].h *= newH / croppingDimensions.h;
					that.annotationList[i].x = (that.annotationList[i].x - croppingDimensions.x) * newW / croppingDimensions.w;
					that.annotationList[i].y = (that.annotationList[i].y - croppingDimensions.y) * newH / croppingDimensions.h;
				} else {
					removeAnnotation(i);
					--l;
					--i;
				}
			}
			that.events.onAnnotationNbChange.fire(that.annotationList.length, oldLength);
			that.HEIGHT = newH;
			that.WIDTH = newW;
		};
	};
})(jQuery, fluid_1_4);