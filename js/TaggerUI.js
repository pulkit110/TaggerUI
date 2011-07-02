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
    var rectX;
    var rectY;
    var m_container;

    var mx, my; // mouse coordinates

	var offsetX, offsetY;
	
	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

	var blurStyle = 'rgba(255,255,255,0.4)';
	var strokeStyle;
	var prevRectIndex = -1;
	
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
	
	//Initialize a new Box and add it
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
		},
		lineWidth: 1,
		strokeStyle: 'white',
		fillStyle: 'rgba(255,255,255,0.4)'
	});
    
    fluid.taggerUI.postInit = function(that) {
    	m_container = that.container;
    	
    	var taggerMouseMove = function (e) {
	    
		    if (!taggerStarted) {
		        return;
		    }
		    getMouse(e);
		    
		    var x = Math.min(mx, rectX);
			var y = Math.min(my, rectY);
			var w = Math.abs(mx - rectX);
			var h = Math.abs(my - rectY);
	
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
						addAnnotation(rectX, rectY, rectW, rectH, tag, that);
						that.events.onAnnotationNbChange.fire(annotationList.length, annotationList.length - 1);
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
			annotationList.splice(i, 1);
			that.events.onAnnotationNbChange.fire(annotationList.length, annotationList.length - 1);
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
	
		    var l = annotationList.length;
		    var i = 0;
			for (i = 0; i < l; i++) {
				if (mx > annotationList[i].x && mx < annotationList[i].x + annotationList[i].w &&  my > annotationList[i].y && my < annotationList[i].y + annotationList[i].h) {
					if (i !== prevRectIndex) {
						prevRectIndex = i;
						context.clearRect(0, 0, canvas.width, canvas.height);
						drawImage(context, image, resizeFactor);
						annotationList[i].draw(context, true);
						drawAllAnnotations(false);
						
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
					}
					
					break;
				}
			}
			
			if (i === l && prevRectIndex !== -1) {
				context.clearRect(0, 0, canvas.width, canvas.height);
				drawImage(context, image, resizeFactor);
				drawAllAnnotations(false);
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
        	var oldLength = annotationList.length;
			annotationList = [];
			if (canvas) {
				canvas.onmousedown = null;
				canvas.onmouseup = null;
				canvas.onmousemove = null;
			}
			that.events.onAnnotationNbChange.fire(annotationList.length, oldLength);
		};
		
		that.doneTagging = function () {
			canvas.onmousedown = null;
			canvas.onmouseup = null;
			canvas.onmousemove = null;
		};
		
		that.showAnnotations = function () {
			context.clearRect(0, 0, canvas.width, canvas.height);
			drawImage(context, image, resizeFactor);
			drawAllAnnotations(false);
			canvas.onmousemove = annotatedMouseMove;
		};
		
		that.hideAnnotations = function () {
			context.clearRect(0, 0, canvas.width, canvas.height);
			drawImage(context, image, resizeFactor);
			canvas.onmousemove = null;
		};
		
		that.getNbAnnotations = function () {
			return annotationList.length;
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
					annotationList.splice(i, 1);
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