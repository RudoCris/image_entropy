
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
ImageProcessing.prototype.binary = function(p) {
	var p = p || 128;
	var dst = this.context.createImageData(this.width, this.height), 
			dstData = dst.data;

	var grData = this.getGrayScale().data;
	var len = grData.length;
	var h = this.getGrayScale().height, w = this.getGrayScale().width;
	

	for (var i = 1; i < h-1; i++) {
		for (var j = 1; j < w-1; j++) {
			
			var s = function(i,j) {return 4 * i * w + 4 * j};
			
			var dta = [
				grData[s(i-1, j-1)],grData[s(i-1, j)],grData[s(i-1, j+1)],
				grData[s(i, j-1)], 	grData[s(i, j)], 	grData[s(i, j+1)],
				grData[s(i+1, j-1)], grData[s(i+1, j)], grData[s(i+1, j+1)]
			];
			
			dstData[s(i,j)] = 
			dstData[s(i,j)+1] = 
			dstData[s(i,j)+2] = (dta.max()+dta.min())/2 > p ? 255 : 0;

			dstData[s(i,j)+3] = 255;
		}
	}
	return dst;
}


ImageProcessing.prototype.negate = function(p){
	this.P = p || this.P;
	
	var src = this.getSource(),
		srcData = src.data;
	var dst = this.context.createImageData(this.width, this.height),
		dstData = dst.data;
	var grData = this.getGrayScale().data;
	
	for (var i = 0, len = srcData.length; i < len; i+=4) {
		if(grData[i] > this.P){
			dstData[i]=255-srcData[i];
			dstData[i+1]=255-srcData[i+1];
			dstData[i+2]=255-srcData[i+2];
		} else {
			dstData[i]=srcData[i];
			dstData[i+1]=srcData[i+1];
			dstData[i+2]=srcData[i+2];
		}
		dstData[i+3]=this.alpha;

	};	
	return dst;
};

ImageProcessing.prototype.negateLevel = function(callback) {
	var p = new Level(this.P, 0, 255, 'P', this);

	return p.domNode(callback);
};



function Level(val, min, max, name, callbackElement){
	this.value = val;
	this.min = min || 0;
	this.max = max || 255;
	this.name = name || 'unnamed';
	this.callbackElement = callbackElement;
}
Level.prototype.domNode = function(callback){
	var input = document.createElement('input');
	var self = this;
	with(input){
		type = "range";
		min = self.min;
		max = self.max;
		name = self.name;
		id = self.name;
		value = self.value || (min+max)/2;
		className = 'level'
	}
	
	// var lblName = document.createElement('label');
	// lblName.textContent = self.name;
	
	// lblName.className = 'lblName';

	var lblValue = document.createElement('label');
	lblValue.textContent = input.value;
	lblValue.id = self.name + '_lblValue';


	var div = document.createElement('div');
	div.className = self.name;
	//div.appendChild(lblName);
	div.appendChild(input);
	div.appendChild(lblValue);

	input.addEventListener('change',function() {
		lblValue.textContent = this.value;
		self.setValue(parseInt(this.value));
	},false);
	input.addEventListener('keyup',function() {
		lblValue.textContent = this.value;
		self.setValue(parseInt(this.value));
	},false);
	if(callback){
		input.addEventListener('change',function() {
			callback();
		},false);
		input.addEventListener('keyup',function() {
			callback();
		},false);
	}
	

	return div;
};
Level.prototype.setValue = function (val) {
	this.value = val;
	this.callbackElement.updateFactor(val, this.name);
};
Level.prototype.showIn = function(parentNode){
	parentNode.appendChild(this.domNode());
};

function Levels(r, g, b){
	this.r = new Level(r || 77, 'red');
	this.g = new Level(g || 150, 'green');
	this.b = new Level(b || 28, 'blue');
	this.updateFactor();
}
Levels.prototype.changeImageData = function(imageData){
	return imageData.grayScale(this.cR, this.cG, this.cB);
};

Levels.prototype.showIn = function(parentNode){
	document.getElementById('levelsBlock').remove();
	
	var levelsBlock = document.createElement('div');
	levelsBlock.id = 'levelsBlock';
	levelsBlock.appendChild(this.r.domNode());
	levelsBlock.appendChild(this.g.domNode());
	levelsBlock.appendChild(this.b.domNode());
	var updBtn = document.createElement('input');

	with(updBtn){
		type = 'button';
		value = 'Просмотр';
		id = 'updBtn';
	}
	levelsBlock.appendChild(updBtn);

	parentNode.appendChild(levelsBlock);
};

Levels.prototype.updateFactor = function() {
	var self = this;
	self.cR = self.r.value/Math.max(self.r.value + self.g.value + self.b.value, 1);
	self.cG = self.g.value/Math.max(self.r.value + self.g.value + self.b.value, 1);
	self.cB = self.b.value/Math.max(self.r.value + self.g.value + self.b.value, 1);
};