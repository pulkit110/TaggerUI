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

	var annotationList = [];

	var canvasElem;
    var canvas;
    var context;
    var WIDTH;
    var HEIGHT;
    var resizeFactor;
    var image;
    var imageX;
    var imageY;
    var taggerStarted;
    var tagX;
    var tagY;
    var tagW;
    var tagH;
    var tagText;
    var m_container;

    var mx, my; // mouse coordinates

	var offsetX, offsetY;
	
	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

	var blurStyle = 'rgba(255,255,255,0.4)';
	var strokeStyle;
	var prevRectIndex = -1;
	var annotation = false;
	var annotationRemove = false;

	
	var setupAnnotation = function(annotation) {
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
		//fillStyle: '#444444',
		strokeStyle: 'white'
	});
	
	fluid.annotation.postInit = function(that) {
		setupAnnotation(that);
		
		that.draw = function (context, isFilled) {
			context.fillStyle = that.options.fillStyle;
			context.strokeStyle = that.options.strokeStyle;
			// We can skip the drawing of elements that have moved off the screen:
			if (that.x > WIDTH || that.y > HEIGHT) {
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
		annotationList.push(newAnnotation);
	};
	
	var drawAllAnnotations = function (isFilled) {
		var l = annotationList.length;
		for (var i = 0; i < l; i++) {
			annotationList[i].draw(context, isFilled);
		}
	};
	
	var updateOffset = function () {
		var element = canvas;
	    offsetX = 0;
	    offsetY = 0;
	
	    if (element.offsetParent) {
	        do {
	            offsetX += element.offsetLeft;
	            offsetY += element.offsetTop;
	            element = element.offsetParent;
	        } while (element);
	    }

	    // Add padding and border style widths to offset
	    offsetX += stylePaddingLeft;
	    offsetY += stylePaddingTop;
	    offsetX += styleBorderLeft;
	    offsetY += styleBorderTop;
	};
	
    // Sets mx,my to the mouse position relative to the canvas
    // unfortunately this can be tricky, we have to worry about padding and borders
	var getMouse = function (e) {
	    updateOffset();
	    mx = e.pageX - offsetX;
	    my = e.pageY - offsetY;
	};

	var drawImage = function (imageCanvasContext, image, resizeFactor) {
		imageCanvasContext.drawImage(image, imageX, imageY, image.width / resizeFactor, image.height / resizeFactor);
	};
	
	var mainDraw = function (x, y, w, h) {	
		context.clearRect(0, 0, canvas.width, canvas.height);
		drawImage(context, image, resizeFactor);
	
	    if (!w || !h) {
	        return;
	    }
	
	    context.strokeRect(x, y, w, h);	
	};
	
	
		
	var removePreviousAnnotation = function () {
		if (annotation) {
			m_container.get()[0].removeChild(annotation);
			annotation = false;
		}
		if (annotationRemove) {
			m_container.get()[0].removeChild(annotationRemove);
			annotationRemove = false;
		}
	};
	
	var drawBackground = function () {
		context.clearRect(0, 0, canvas.width, canvas.height);
		drawImage(context, image, resizeFactor);
	};
	
	var updateAnnotationHeight = function (that, newHeight) {
		that.events.onChangeHeight.fire(newHeight);
	};
	
	var updateAnnotationWidth = function (that, newWidth) {
		that.events.onChangeWidth.fire(newWidth);
	};
	
	var updateAnnotationLocationX = function (that, newLocationX) {
		that.events.onChangeLocationX.fire(newLocationX);
	};
	
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
		fillStyle: 'rgba(255,255,255,0.4)'
	});
    
    fluid.taggerUI.postInit = function(that) {
    	m_container = that.container;
    	
    	var taggerMouseDown = function (e) {
		    getMouse(e);
		    
		    taggerStarted = true;
		    tagX = mx;
		    that.events.onChangeLocationX.fire(tagX);
		    tagY = my;
		    that.events.onChangeLocationY.fire(tagY);
		};
    
    	var taggerMouseMove = function (e) {
	    
		    if (!taggerStarted) {
		        return;
		    }
		    getMouse(e);
		    
		    var x = Math.min(mx, tagX);
		    that.events.onChangeLocationX.fire(x);
			var y = Math.min(my, tagY);
			that.events.onChangeLocationY.fire(y);
			var w = Math.abs(mx - tagX);
			that.events.onChangeWidth.fire(w);
			
			var h = Math.abs(my - tagY);
			that.events.onChangeHeight.fire(h);

			mainDraw(x, y, w, h);	    
		};
	
	    var taggerMouseUp = function (e) {
			getMouse(e);
			if (taggerStarted) {
				tagH = my - tagY;
				tagW = mx - tagX;
				that.cropper.init(canvas, resizeFactor, image, imageX, imageY, tagX, tagY, tagW, tagH);
			}
		};
		
		var removeAnnotation = function (i) {
			annotationList.splice(i, 1);
			that.events.onAnnotationRemove.fire(i);
			that.events.onAnnotationNbChange.fire(annotationList.length, annotationList.length + 1);
			canvasElem.mousemove();
		};
		
		var createCrossButton = function (box, index) {
			var annotationRemove = document.createElement("button");
			annotationRemove.style.position = 'absolute';
			annotationRemove.style.top = offsetY + box.y + "px";
			annotationRemove.style.left = offsetX + box.x + box.w - 20 + "px";
			annotationRemove.className += ' annotation';
			annotationRemove.className += ' fl-tagger-annotation-action-remove';
			
			annotationRemove.onclick = function () {
				removeAnnotation(index);
			};
			
			return annotationRemove;
		};
		
		var showAnnotationAt = function (i) {
			// Remove previously shown annotation (important when two annotations overlap)
			removePreviousAnnotation();
			
			// Show annotation on mouse over
			annotation = document.createElement("div");
			annotation.style.position = 'absolute';
			annotation.style.top = (offsetY + annotationList[i].y) + "px";
			annotation.style.left = offsetX + annotationList[i].x + "px";
			annotation.style.width = annotationList[i].w + 'px';
			annotation.style.lineHeight = annotationList[i].h + 'px';
			annotation.className += ' fl-tagger-annotation';
	
			annotation.innerHTML = annotationList[i].tag;
			
			//Create cross button
			annotationRemove = createCrossButton(annotationList[i], i);
			
			m_container.get()[0].appendChild(annotation);
			m_container.get()[0].appendChild(annotationRemove);
		};
		
		var annotatedMouseMove = function (e) {
		    getMouse(e);
	
		    var l = annotationList.length;
		    var i = 0;
			for (i = 0; i < l; i++) {
				if (mx > annotationList[i].x && mx < annotationList[i].x + annotationList[i].w &&  my > annotationList[i].y && my < annotationList[i].y + annotationList[i].h) {
					if (i !== prevRectIndex) {
						prevRectIndex = i;
						drawBackground();
						drawAllAnnotations(false);
						annotationList[i].draw(context, true);
						showAnnotationAt(i);
					}
					break;
				}
			}
			
			if (i === l && prevRectIndex !== -1) {
				drawBackground();
				drawAllAnnotations(false);
				prevRectIndex = -1;
				removePreviousAnnotation();
			}
		};
		
    	that.init = function (a_canvas, a_resizeFactor, a_image, a_imageX, a_imageY) {

			canvasElem = a_canvas;
            canvas = a_canvas.get()[0];
            context = canvas.getContext('2d');
            resizeFactor = a_resizeFactor;
            image = a_image;
            imageX = a_imageX;
            imageY = a_imageY;
            taggerStarted = false;
            WIDTH = canvas.width;
            HEIGHT = canvas.height;
            
			strokeStyle = that.options.strokeStyle;
			context.strokeStyle = strokeStyle;
			context.lineWidth = that.options.lineWidth;
			
			that.cropper = fluid.cropperUI(that.container);
			
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
		
			//fixes a problem where double clicking causes text to get selected on the canvas
			canvas.onselectstart = function () {
				return false;
			};
			
			// fixes mouse co-ordinate problems when there's a border or padding
			// see getMouse for more detail
			if (document.defaultView && document.defaultView.getComputedStyle) {
				stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null).paddingLeft, 10)     || 0;
				stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null).paddingTop, 10)      || 0;
				styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null).borderLeftWidth, 10) || 0;
				styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null).borderTopWidth, 10)  || 0;
			}
			
            // Attach the mousedown, mousemove and mouseup event listeners.
            canvas.onmousedown = taggerMouseDown;
            canvas.onmouseup = taggerMouseUp;
            canvas.onmousemove = taggerMouseMove;
        };
        
        that.reset = function () {
        	var oldLength = annotationList.length;
			annotationList = [];
			if (canvas) {
				canvas.onmousedown = null;
				canvas.onmouseup = null;
				canvas.onmousemove = null;
			}
			that.events.onAnnotationNbChange.fire(annotationList.length, oldLength);
		};
		
		that.confirmTagAdd = function (tagText) {
			var croppingReturnValues = that.cropper.reset(true);
			var tagDimensions = croppingReturnValues[1];
			tagX = tagDimensions.x;
			tagY = tagDimensions.y;
			tagW = tagDimensions.w;
			tagH = tagDimensions.h;
			
			if (tagH < 0) {
				tagY = my;
				tagH = -tagH;
			}
			if (tagW < 0) {
				tagX = mx;
				tagW = -tagW;
			}
			addAnnotation(tagX, tagY, tagW, tagH, tagText, that);
			that.events.onAnnotationAdd.fire(annotationList[annotationList.length - 1].tag);
			that.events.onAnnotationNbChange.fire(annotationList.length, annotationList.length - 1);

			// Clear the canvas and draw image on canvas
			drawBackground();
		};
		
		that.deleteTag = function (index) {
			removeAnnotation(index);
		};
		
		that.doneTagging = function () {
			if (canvas) {
				canvas.onmousedown = null;
				canvas.onmouseup = null;
				canvas.onmousemove = null;
			}
		};
		
		that.showAnnotations = function () {
			drawBackground();
			drawAllAnnotations(false);
			canvas.onmousemove = annotatedMouseMove;
		};
		
		that.hideAnnotations = function () {
			drawBackground();
			canvas.onmousemove = null;
		};
		
		that.highlightTag = function (i) {
			updateOffset();
			if (i < annotationList.length) {
				prevRectIndex = i;
				drawBackground();
				drawAllAnnotations(false);
				
				annotationList[i].draw(context, true);
				showAnnotationAt(i);
			}
		};
		
		that.removeHighlights = function () {
			removePreviousAnnotation();
			that.showAnnotations();
		};
		
		that.getNbAnnotations = function () {
			return annotationList.length;
		};
		
		that.getTagList = function () {
			var tagList = new Array(annotationList.length);
			for (var i = 0; i < annotationList.length; ++i) {
				tagList[i] = annotationList[i].tag;
			}
			return tagList;
		};
		
		that.setLocationX = function (newLocationX) {
			tagX = newLocationX;
			if (!taggerStarted) {
				that.cropper.init(canvas, resizeFactor, image, imageX, imageY, tagX, tagY, tagW, tagH);
			}
			return that.cropper.setLocationX(newLocationX);
		};
        
        that.setLocationY = function (newLocationY) {
        	tagY = newLocationY;
			if (!taggerStarted) {
				that.cropper.init(canvas, resizeFactor, image, imageX, imageY, tagX, tagY, tagW, tagH);
			}
			return that.cropper.setLocationY(newLocationY);
		};
		
		that.setWidth = function (newWidth, isFixedRatioOn) {
			tagW = newWidth;
			if (!taggerStarted) {
				that.cropper.init(canvas, resizeFactor, image, imageX, imageY, tagX, tagY, tagW, tagH);
			}
			return that.cropper.setWidth(newWidth, false);
		};
		
		that.setHeight = function (newHeight, isFixedRatioOn) {
			tagH = newHeight;
			if (!taggerStarted) {
				that.cropper.init(canvas, resizeFactor, image, imageX, imageY, tagX, tagY, tagW, tagH);
			}
			return that.cropper.setHeight(newHeight, false);
		};
		
		that.adjustTagsForResize = function (newW, newH, a_resizeFactor, a_image, a_imageX, a_imageY) {
			image = a_image;
			resizeFactor = a_resizeFactor;
			imageX = a_imageX;
			imageY = a_imageY;
			
		    var l = annotationList.length;
		    var i = 0;
			for (i = 0; i < l; i++) {
				annotationList[i].w *= newW / WIDTH;
				annotationList[i].h *= newH / HEIGHT;
				annotationList[i].x *= newW / WIDTH;
				annotationList[i].y *= newH / HEIGHT;
			}
			
			HEIGHT = newH;
            WIDTH = newW;
		};
		
		that.adjustTagsForCrop = function (newW, newH, a_resizeFactor, a_image, a_imageX, a_imageY, croppingDimensions) {
			image = a_image;
			resizeFactor = a_resizeFactor;
			imageX = a_imageX;
			imageY = a_imageY;
			var oldLength = annotationList.length; 
		    var l = annotationList.length;
		    var i = 0;
			for (i = 0; i < l; i++) {
				if (annotationList[i].x >= croppingDimensions.x && annotationList[i].x + annotationList[i].w <= croppingDimensions.x + croppingDimensions.w &&
						annotationList[i].y >= croppingDimensions.y && annotationList[i].y + annotationList[i].h <= croppingDimensions.y + croppingDimensions.h) {
					annotationList[i].w *= newW / croppingDimensions.w;
					annotationList[i].h *= newH / croppingDimensions.h;
					annotationList[i].x = (annotationList[i].x - croppingDimensions.x) * newW / croppingDimensions.w;
					annotationList[i].y = (annotationList[i].y - croppingDimensions.y) * newH / croppingDimensions.h;
				} else {
					removeAnnotation(i);
					--l;
					--i;
				}
			}
			that.events.onAnnotationNbChange.fire(annotationList.length, oldLength);
			HEIGHT = newH;
            WIDTH = newW;
		};
    };
    
})(jQuery, fluid_1_4);