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
/*global window, fluid_1_4:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_4 = fluid_1_4 || {};

/*************
 * Tagger UI *
 *************/

 (function($, fluid){

    //we'll add some private methods here

    var enableElement = function(that, elm){
        elm.prop("disabled", false);
        elm.removeClass(that.options.styles.dim);
    };

    var disableElement = function(that, elm){
        elm.prop("disabled", true);
        elm.addClass(that.options.styles.dim);
    };

    var showElement = function(that, elm){
        elm.removeClass(that.options.styles.hidden);
    };

    var hideElement = function(that, elm){
        elm.addClass(that.options.styles.hidden);
    };

    var bindDOMEvents = function(that){
        that.locate("resizeButton").click(function(){
            //TODO: Bind resize event
            //that.start();
            });
    };


	var boxes2 = [];

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
	var prevRectIndex = -1;

    // The active tool instance.
    var tool;

    // Sets mx,my to the mouse position relative to the canvas
    // unfortunately this can be tricky, we have to worry about padding and borders
	function getMouse(e){
	    var element = canvas;
	    offsetX = 0;
	    offsetY = 0;
	
	    if (element.offsetParent){
	        do{
	            offsetX += element.offsetLeft;
	            offsetY += element.offsetTop;
	        }
	        while ((element = element.offsetParent));
	    }
	
	    // Add padding and border style widths to offset
	    offsetX += stylePaddingLeft;
	    offsetY += stylePaddingTop;
	
	    offsetX += styleBorderLeft;
	    offsetY += styleBorderTop;
	
	    mx = e.pageX - offsetX;
	    my = e.pageY - offsetY
	}

    taggerMouseDown = function(e){
        getMouse(e);
        
        taggerStarted = true;
        rectX = mx;
        rectY = my;
    };

    taggerMouseMove = function(e){
	    
	    if (!taggerStarted){
	        return;
	    }
	    
	    getMouse(e);

	    var x = Math.min(mx, rectX),
	    	y = Math.min(my, rectY),
	    	w = Math.abs(mx - rectX),
	    	h = Math.abs(my - rectY);
	    	
	    mainDraw(x, y, w, h);	    
	}

    taggerMouseUp = function(e){
    	getMouse(e);
        if (taggerStarted){
        	var tag = prompt("Enter any tag");
			if (tag != null && tag != "") {
				
				var rectH = my - rectY;
				var rectW = mx - rectX;
				
				if ( rectH < 0) {
					rectY = my;
					rectH = -rectH;
				}
				if (rectW < 0) {
					rectX = mx;
					rectW = -rectW;
				}
				
				addRect (rectX, rectY, rectW, rectH, blurStyle, tag);
			}
			
        	taggerStarted = false;
            taggerMouseMove(e);
        }
    }

	function mainDraw(x, y, w, h) {	
		context.clearRect(0, 0, canvas.width, canvas.height);
		drawImage(context, image, resizeFactor);
	
	    if (!w || !h){
	        return;
	    }
	
	    context.strokeRect(x, y, w, h);	
	}
	
	var annotation = false;
	annotatedMouseMove = function(e){
	    getMouse(e);

		var backgroundDrew = false;

	    var l = boxes2.length;
	    var i = 0;
		for (i = 0; i < l; i++) {
			if (mx > boxes2[i].x && mx < boxes2[i].x+boxes2[i].w &&  my > boxes2[i].y && my < boxes2[i].y+boxes2[i].h) {
				if (i != prevRectIndex) {
					prevRectIndex = i;
					context.clearRect(0, 0, canvas.width, canvas.height);
					drawImage (context, image, resizeFactor);
					boxes2[i].draw(context, true);
					drawAllBoxes(false);
					
					// Remove previously shown annotation (important when two annotations overlap)
					if (annotation) {
						m_container.get()[0].removeChild(annotation);
						annotation = false;
					}
					
					// Show annotation on mouse over
					annotation = document.createElement("div");
					annotation.style.position = 'absolute';
					annotation.style.top = (offsetY + boxes2[i].y) + "px";
					annotation.style.left = offsetX + boxes2[i].x + "px";
					annotation.style.width = boxes2[i].w + 'px';
					annotation.style.lineHeight = boxes2[i].h + 'px';
					annotation.className += ' annotation';

					annotation.innerHTML = boxes2[i].tag;
					
					
					m_container.get()[0].appendChild(annotation);
				}
				break;
			}
		}
		
		if (i == l && prevRectIndex != -1) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			drawImage (context, image, resizeFactor);
			drawAllBoxes(false);
			prevRectIndex = -1;
			if(annotation) {
				m_container.get()[0].removeChild(annotation);
				annotation = false;
			}
		}
	}
	
	function drawAllBoxes(isFilled) {
		var l = boxes2.length;
		for (var i = 0; i < l; i++) {
			boxes2[i].draw(context, isFilled);
		}
	}
	
	function drawImage(imageCanvasContext, image, resizeFactor) {
		imageCanvasContext.drawImage(image, imageX, imageY, image.width/resizeFactor, image.height/resizeFactor);
	}
	
	function Box2() {
		this.x = 0;
		this.y = 0;
		this.w = 1; // default width and height?
		this.h = 1;
		this.fill = '#444444';
		this.tag = "default tag";
	}
	
	// New methods on the Box class
	Box2.prototype = {
		draw: function(context, isFilled) {
			context.fillStyle = this.fill;
				
			// We can skip the drawing of elements that have moved off the screen:
			if (this.x > WIDTH || this.y > HEIGHT)
				return;
			if (this.x + this.w < 0 || this.y + this.h < 0)
				return;
	
			if (isFilled) {
				context.fillRect(this.x, this.y, this.w, this.h);
			} else {
				context.strokeRect(this.x,this.y,this.w,this.h);
			}
		} // end draw
	}
	
	//Initialize a new Box and add it
	function addRect(x, y, w, h, fill, tag) {
		var rect = new Box2;
		rect.x = x;
		rect.y = y;
		rect.w = w
		rect.h = h;
		rect.fill = fill;
		rect.tag = tag;
		boxes2.push(rect);
	}
	
    /**
     * Instantiates a new TaggerUI component.
     * 
     * @param {Object} container the DOM element in which the Image Editor lives
     * @param {Object} options configuration options for the component.
     */
    fluid.taggerUI = function(container, options){
        var that = fluid.initView("fluid.taggerUI", container, options);
        
        m_container = container;
        
        that.init = function(a_canvas, a_resizeFactor, a_image, a_imageX, a_imageY){

			canvasElem = a_canvas;
            canvas = a_canvas.get()[0];
            HEIGHT = canvas.height;
            WIDTH = canvas.width;
            context = canvas.getContext('2d');
            resizeFactor = a_resizeFactor;
            image = a_image;
            imageX = a_imageX;
            imageY = a_imageY;
            taggerStarted = false;
			 
			context.strokeStyle = that.options.strokeStyle;
			context.lineWidth = that.options.lineWidth;
			
			//fixes a problem where double clicking causes text to get selected on the canvas
			canvas.onselectstart = function () {
				return false;
			}
			
			// fixes mouse co-ordinate problems when there's a border or padding
			// see getMouse for more detail
			if (document.defaultView && document.defaultView.getComputedStyle) {
				stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)     || 0;
				stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)      || 0;
				styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
				styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)  || 0;
			}
			
            // Attach the mousedown, mousemove and mouseup event listeners.
            canvas.onmousedown = taggerMouseDown;
            canvas.onmouseup = taggerMouseUp;
            canvas.onmousemove = taggerMouseMove;

        }
        
        that.reset = function() {
        	boxes2 = [];
        	if (canvas) {
				canvas.onmousedown = null;
				canvas.onmouseup = null;
				canvas.onmousemove = null;
			}
		}
		
		that.doneTagging = function() {
			canvas.onmousedown = null;
			canvas.onmouseup = null;
			canvas.onmousemove = null;
		}
		
		that.showAnnotations = function() {
			context.clearRect(0, 0, canvas.width, canvas.height);
			drawImage (context, image, resizeFactor);
			drawAllBoxes(false);
			canvas.onmousemove = annotatedMouseMove;
		}
		
		that.hideAnnotations = function() {
			context.clearRect(0, 0, canvas.width, canvas.height);
			drawImage (context, image, resizeFactor);
			canvas.onmousemove = null;
		}
		
		that.getNbAnnotations = function() {
			return boxes2.length;
		}

        return that;
    }
    
    fluid.defaults("fluid.taggerUI", {
        gradeNames: "fluid.viewComponent",
        lineWidth: 1,
        strokeStyle: 'white'
    });
    
})(jQuery, fluid_1_4);