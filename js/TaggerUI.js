/*
Copyright 2008-2009 University of Toronto
Copyright 2008-2009 University of California, Berkeley
Copyright 2010-2011 OCAD University

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

	var boxes = [];

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
    var rectX;
    var rectY;
    var m_container;
    var annotationNbUpdater = false;

    var mx, my; // mouse coordinates

	var offsetX, offsetY;
	
	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

	var blurStyle = 'rgba(255,255,255,0.4)';
	var strokeStyle;
	var prevRectIndex = -1;
	

	function Box() {
		this.x = 0;
		this.y = 0;
		this.w = 1; // default width and height?
		this.h = 1;
		this.fill = '#444444';
		this.tag = "default tag";
	}
	
	// New methods on the Box class
	Box.prototype = {
		draw: function (context, isFilled) {
			context.fillStyle = this.fill;
			context.strokeStyle = strokeStyle;
			// We can skip the drawing of elements that have moved off the screen:
			if (this.x > WIDTH || this.y > HEIGHT) {
				return;
			}
			if (this.x + this.w < 0 || this.y + this.h < 0) {
				return;
			}
			if (isFilled) {
				context.fillRect(this.x, this.y, this.w, this.h);
			} else {
				context.strokeRect(this.x, this.y, this.w, this.h);
			}
			
		} // end draw
	};

	//Initialize a new Box and add it
	var addRect = function (x, y, w, h, fill, tag) {
		var rect = new Box();
		rect.x = x;
		rect.y = y;
		rect.w = w;
		rect.h = h;
		rect.fill = fill;
		rect.tag = tag;
		boxes.push(rect);
	};
	
	var drawAllBoxes = function (isFilled) {
		var l = boxes.length;
		for (var i = 0; i < l; i++) {
			boxes[i].draw(context, isFilled);
		}
	};
	
    // Sets mx,my to the mouse position relative to the canvas
    // unfortunately this can be tricky, we have to worry about padding and borders
	var getMouse = function (e) {
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
	
	    mx = e.pageX - offsetX;
	    my = e.pageY - offsetY;
	};

    var taggerMouseDown = function (e) {
        getMouse(e);
        
        taggerStarted = true;
        rectX = mx;
        rectY = my;
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
	
    var taggerMouseMove = function (e) {
	    
	    if (!taggerStarted) {
	        return;
	    }
	    
	    getMouse(e);

	    var x = Math.min(mx, rectX),
			y = Math.min(my, rectY),
			w = Math.abs(mx - rectX),
			h = Math.abs(my - rectY);

		mainDraw(x, y, w, h);	    
	};

    var taggerMouseUp = function (e) {
		getMouse(e);
		if (taggerStarted) {
			var tag = prompt("Enter any tag");
			if (tag !== null && tag !== "") {

				var rectH = my - rectY;
				var rectW = mx - rectX;

				if (rectH < 0) {
					rectY = my;
					rectH = -rectH;
				}
				if (rectW < 0) {
					rectX = mx;
					rectW = -rectW;
				}

				if (rectW === 0 || rectH === 0) {
					alert("Error creating tag! Please specify non-zero height and width");
				} else {
					addRect(rectX, rectY, rectW, rectH, blurStyle, tag);
					if (annotationNbUpdater) {
						annotationNbUpdater(boxes.length);
					}
				}

				// Clear the canvas and draw image on canvas
				context.clearRect(0, 0, canvas.width, canvas.height);
				drawImage(context, image, resizeFactor);
			}

			taggerStarted = false;
			taggerMouseMove(e);
		}
	};
	
	var annotation = false;
	var annotationRemove = false;
	
		
	var removeAnnotation = function (i) {
		boxes.splice(i, 1);
		if (annotationNbUpdater) {
			annotationNbUpdater(boxes.length);
		}
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
	
	var annotatedMouseMove = function (e) {
	    getMouse(e);

	    var l = boxes.length;
	    var i = 0;
		for (i = 0; i < l; i++) {
			if (mx > boxes[i].x && mx < boxes[i].x + boxes[i].w &&  my > boxes[i].y && my < boxes[i].y + boxes[i].h) {
				if (i !== prevRectIndex) {
					prevRectIndex = i;
					context.clearRect(0, 0, canvas.width, canvas.height);
					drawImage(context, image, resizeFactor);
					boxes[i].draw(context, true);
					drawAllBoxes(false);
					
					// Remove previously shown annotation (important when two annotations overlap)
					if (annotation) {
						m_container.get()[0].removeChild(annotation);
						annotation = false;
					}
					if (annotationRemove) {
						m_container.get()[0].removeChild(annotationRemove);
						annotationRemove = false;
					}
					
					// Show annotation on mouse over
					annotation = document.createElement("div");
					annotation.style.position = 'absolute';
					annotation.style.top = (offsetY + boxes[i].y) + "px";
					annotation.style.left = offsetX + boxes[i].x + "px";
					annotation.style.width = boxes[i].w + 'px';
					annotation.style.lineHeight = boxes[i].h + 'px';
					annotation.className += ' fl-tagger-annotation';

					annotation.innerHTML = boxes[i].tag;
					
					//Create cross button
					annotationRemove = createCrossButton(boxes[i], i);
					
					m_container.get()[0].appendChild(annotation);
					m_container.get()[0].appendChild(annotationRemove);
				}
				
				break;
			}
		}
		
		if (i === l && prevRectIndex !== -1) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			drawImage(context, image, resizeFactor);
			drawAllBoxes(false);
			prevRectIndex = -1;
			if (annotation) {
				m_container.get()[0].removeChild(annotation);
				annotation = false;
			}
			if (annotationRemove) {
				m_container.get()[0].removeChild(annotationRemove);
				annotationRemove = false;
			}
		}
	};
	
    /**
     * Instantiates a new TaggerUI component.
     * 
     * @param {Object} container the DOM element in which the Image Editor lives
     * @param {Object} options configuration options for the component.
     */
    fluid.taggerUI = function (container, options) {
        var that = fluid.initView("fluid.taggerUI", container, options);
        annotationNbUpdater = that.options.annotationNbUpdater;
        
        m_container = container;
        
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
			boxes = [];
			if (canvas) {
				canvas.onmousedown = null;
				canvas.onmouseup = null;
				canvas.onmousemove = null;
			}
			if (annotationNbUpdater) {
				annotationNbUpdater(boxes.length);
			}
		};
		
		that.doneTagging = function () {
			canvas.onmousedown = null;
			canvas.onmouseup = null;
			canvas.onmousemove = null;
		};
		
		that.showAnnotations = function () {
			context.clearRect(0, 0, canvas.width, canvas.height);
			drawImage(context, image, resizeFactor);
			drawAllBoxes(false);
			canvas.onmousemove = annotatedMouseMove;
		};
		
		that.hideAnnotations = function () {
			context.clearRect(0, 0, canvas.width, canvas.height);
			drawImage(context, image, resizeFactor);
			canvas.onmousemove = null;
		};
		
		that.getNbAnnotations = function () {
			return boxes.length;
		};
		
		that.adjustTagsForResize = function (newW, newH, a_resizeFactor, a_image, a_imageX, a_imageY) {
			image = a_image;
			resizeFactor = a_resizeFactor;
			imageX = a_imageX;
			imageY = a_imageY;
			
		    var l = boxes.length;
		    var i = 0;
			for (i = 0; i < l; i++) {
				boxes[i].w *= newW / WIDTH;
				boxes[i].h *= newH / HEIGHT;
				boxes[i].x *= newW / WIDTH;
				boxes[i].y *= newH / HEIGHT;
			}
			
			HEIGHT = newH;
            WIDTH = newW;
		};
		
		that.adjustTagsForCrop = function (newW, newH, a_resizeFactor, a_image, a_imageX, a_imageY, croppingDimensions) {
			image = a_image;
			resizeFactor = a_resizeFactor;
			imageX = a_imageX;
			imageY = a_imageY;
			
		    var l = boxes.length;
		    var i = 0;
			for (i = 0; i < l; i++) {
				if (boxes[i].x >= croppingDimensions.x && boxes[i].x + boxes[i].w <= croppingDimensions.x + croppingDimensions.w &&
						boxes[i].y >= croppingDimensions.y && boxes[i].y + boxes[i].h <= croppingDimensions.y + croppingDimensions.h) {
					boxes[i].w *= newW / croppingDimensions.w;
					boxes[i].h *= newH / croppingDimensions.h;
					boxes[i].x = (boxes[i].x - croppingDimensions.x) * newW / croppingDimensions.w;
					boxes[i].y = (boxes[i].y - croppingDimensions.y) * newH / croppingDimensions.h;
				} else {
					boxes.splice(i, 1);
					--l;
					--i;
				}

			}
			
			if (annotationNbUpdater) {
				annotationNbUpdater(boxes.length);
			}
			
			HEIGHT = newH;
            WIDTH = newW;
		};

        return that;
	};
    
    fluid.defaults("fluid.taggerUI", {
		gradeNames: "fluid.viewComponent",
		styles: {
			remove: "fl-image-editor-annotation-action-remove"
		},
		status: {
			remove: "Press Delete key to remove annotation"
		},
		annotationNbUpdater: false,
		lineWidth: 1,
		strokeStyle: 'white'
	});
    
})(jQuery, fluid_1_4);