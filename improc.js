function ImageProcessing(image, context){
	this.context = context;
	this.width = image.width;
	this.height = image.height;

	this.alpha = 255;	//уровень альфа-канала [прозрачность]
	this.cR = 0.3;
	this.cG = 0.59;
	this.cB = 0.11;

	this.P = 128;
	return this;
}

ImageProcessing.prototype.getSource = function() {
	return this.context.getImageData(0,0,this.width, this.height);
};

ImageProcessing.prototype.grayScale = function(cR, cG, cB){
	this.cR = cR || this.cR;
	this.cG = cG || this.cG;
	this.cB = cB || this.cB;
	var src = this.getSource(),
		srcData = src.data;
	var dst = this.context.createImageData(this.width, this.height),
		dstData = dst.data;
	
	var maxx = 0;
	
	var hist_arr = [];
	for (var i = 0; i < 256; i++) {
		hist_arr[i] = 0;
	};
	
	for (var i = 0, len=srcData.length; i < len; i+=4) {
		var gr = Math.round(srcData[i]*this.cR + srcData[i+1]*this.cG + srcData[i+2]*this.cB);
			dstData[i]=dstData[i+1]=dstData[i+2]=gr;
			dstData[i+3]=this.alpha; //альфа[прозрачность] (rgbA)
			if(hist_arr[gr]){
				hist_arr[gr]++;
			} else {
				hist_arr[gr]=1;
			}
			maxx = Math.max(maxx, hist_arr[gr]);
			if (isNaN(maxx)) {
				console.error('maxx is NaN!');
			};
	};
		
	this.grayScaleImage = dst;

	this.histogram = {
		data: hist_arr,
		maxx: maxx,
		display: function (width, height) {
			var width = width || 255,
				height = height || 255;
			var canv = document.createElement('canvas');
			canv.width = width;
			canv.height = height;
			var ctx = canv.getContext('2d');
			//ctx.rotate(Math.PI);
			for (var i = 0, step = width/255; i < 256; i++) {
				ctx.fillStyle = '#'+i.toString(16)+'0000';
				
				ctx.fillRect(i*step, height, step, -height*this.data[i]/Math.max(this.maxx, 1));
				// ctx.fillRect(i*step, height, step, -height*hist_arr[i]/Math.max(maxx, 1));
			};
			
			return ctx.getImageData(0, 0, width, height);
		}
	};
	return dst;
};

ImageProcessing.prototype.getGrayScale = function(){
	return this.grayScaleImage || this.grayScale();
};

ImageProcessing.prototype.halfWavelet = function (img_data) {
	var img_data = img_data || this.getGrayScale(),
		  result = {
		  	left_part: this.context.createImageData(this.width/2, this.height),
		  	right_part: this.context.createImageData(this.width/2, this.height)
		  };
	var left_half = [], 
			right_half = [],
			size = this.width/2;

	img_data.each({
		offset: 1,
		callback: function(element, neighbor, current_position){
			var x1 = element.R,
					x2 = neighbor({x: 1}).R;
			if(current_position.x < size){
				var new_gray_scale_pixel_color = parseInt((x1 + x2) / 2);
				left_half = left_half.concat(ImageData.createGrayScalePixel(new_gray_scale_pixel_color));
			}else{
				var new_gray_scale_pixel_color = parseInt((x1 - x2) / 2);
				right_half = right_half.concat(ImageData.createGrayScalePixel(new_gray_scale_pixel_color));
			}
		}
	});

	result.left_part.data.set(left_half);
	result.right_part.data.set(right_half);

	return result;
};

ImageProcessing.prototype.fullWavelet = function() {
	var gray_scale = this.getGrayScale(),
			width = gray_scale.width,
			height = gray_scale.height;

	var horizontal_wavelet = this.halfWavelet(gray_scale);
	var tmp_canvas = document.createElement("canvas"),
			context = tmp_canvas.getContext("2d");

	tmp_canvas.height = height;
	tmp_canvas.width = width;
	context.putImageData(horizontal_wavelet.left_part, 0, 0);
	context.putImageData(horizontal_wavelet.right_part, horizontal_wavelet.left_part.width, 0);

	context.save();
	context.translate(width, 0);
	context.rotate(Math.PI/2);
	context.drawImage(tmp_canvas, 0, 0, width, height);
	context.restore();
	var rotate_horizontal_wavelet = context.getImageData(0, 0, width, height);
	var vertical_wavelet = this.halfWavelet(rotate_horizontal_wavelet);
	return vertical_wavelet;
};

ImageProcessing.prototype.entropy = function(){
	var dst = this.context.createImageData(this.width, this.height), 
			dstData = dst.data;

	var grData = this.getGrayScale().data;
	var len = grData.length;
	var h = this.getGrayScale().height, w = this.getGrayScale().width;
	var histogram = this.histogram.data;
	var entrop_hist = [];
	var log = Math.log;
	for (var i = 0; i < 255; i++) {
		entrop_hist.push(histogram[i]*(log(histogram[i])/log(2)))
	};
	return entrop_hist;
}
 
Array.prototype.max = function() {
  return Math.max.apply(null, this);
};

Array.prototype.min = function() {
  return Math.min.apply(null, this);
};

ImageData.prototype.each = function(attrs){
	var height = this.height, 
			width = this.width,
			offset = attrs.offset || 0;
	
	for (var i = offset; i < height - offset; i++) {
		for (var j = offset; j < width - offset; j++) {
			var color_data_index = 4 * i * width + 4 * j,
					element = this.getPixel(color_data_index),
					image_data = this, 
					neighbor = function(offset){
						var offset_x = offset.x || 0,
								offset_y = offset.y || 0;
						var neibor_data_index = 4 * (i + offset_y) * width + 4 * (j + offset_x);
						return image_data.getPixel(neibor_data_index);
					},
					current_position = {x: j, y: i};

			attrs.callback(element, neighbor, current_position)
		}
	}

}

ImageData.prototype.getPixel = function(color_data_index){
	var data = this.data;
	return {
						R: data[color_data_index],
						G: data[color_data_index + 1],
						B: data[color_data_index + 2],
						A: data[color_data_index + 3]
					}
}

ImageData.createGrayScalePixel = function(color){
	return [color, color, color, 255];
}
