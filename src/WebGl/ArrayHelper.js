var Inherit = {
	/* 对对象进行浅表复制，主要用于重载（覆盖）某些方法或属性 */
	extend : function(o, oo){
		for(var p in oo){ o[p] = oo[p]; };
		p = null;
	},
	/*
	* 通过创建的基类实例建立原型链，实现继承
	* target:子类构造函数名
	* obj:基类实例
	* ext:扩展属性，包括子类独有的属性/方法和需要重载的部分
	*/
	inherit : function(target, obj, ext){
		if(typeof target != 'function') return;
		target.prototype = obj;
		if(!!ext && ext instanceof Object){
			this.extend(target.prototype, ext);
		}
	}
}

/*
* ArrayHelper
* 数组管理基类
* by MK 2011-12-1
*/
function ArrayHelper(){ }
ArrayHelper.prototype = {
	IS_ArrayHelper : true,
	/* 分组单元长度，初始值为1，颜色应为4，定点应为3，需重载 */
	length : 1,
	/* 附加到原始数组
	@data:原始数组
	@offset:位于原始数组的偏移量
	*/
	attach : function(data, offset){
		delete this.data;
		delete this.offset;
		if(data instanceof Array){
			this.data = data;
			this.offset = Math.max(offset || 0, 0);
		}
	},
	/* 遍历所位于的数组区域，并执行回调函数 */
	each : function(callback){
		if(typeof callback == 'function'){
			for(var i = 0; i < this.length; i++){
				callback(this.data, i + this.offset, i);
			}
		}
	},
	/* 获取本区索引位置值，index为相对位置 */
	get : function(index){
		if(typeof index == 'number' && index < this.length){
			return this.data[index + this.offset];
		}
	},
	/*
	* 设置本区索引位置值，index为相对位置。具体执行取决于参数状态。需重载
	* 1. index(索引)有效时，按索引赋值
	* 2. value为数组时，按数组索引对本区索引赋值
	* 3. 仅value有效时，本区全体赋值为value
	*/
	set : function(value, index){
		if(typeof index == 'number' && index < this.length){
			this.data[index + this.offset] = value;
		} else if(value instanceof Array){
			this.each(function(data, ii, i){
				if(i < value.length){
					data[ii] = value[i];
				}
			});
		} else if(value === 0 || !!value){
			this.each(function(data, ii){
				data[ii] = value;
			});
		}
	},
	/* 本区数据归零 */
	clear : function(){
		this.each(function(data, ii){ data[ii] = 0; });
	},
	/* 返回本区数据的一个副本 */
	array : function(){
		return this.data.slice(this.offset, this.offset + this.length);
	}
}
ArrayHelper.model = function(model, count, target){
	if(!(target instanceof Array)) return;
	var i = 0, j;
	for(; i < count; i++){
		j = 0;
		for(; j < model.length; j++){
			target.push(model[j]);
		}
	}
	i = j = null;
}

/* ******************************************************** */

/*
ColorHelper
颜色管理类
by MK 2011-12-2
*/
var ColorHelper = function(data, offset){
	/* 尝试附加数据 */
	this.attach(data, offset);
	/* 重载本区长度值 */
	this.length = 4;
}
/* 扩展ColorHelper的静态方法 */
Inherit.extend(ColorHelper, {
	/* 对象转换为颜色数据。转换失败则返回0 */
	ObjectToNumber : function(s, d){
		return (!!s?isNaN(s=Number('0x'+((s=s+'').length>1?s.substr(0,2):s+s)))?d||0:s:s===0?s:d||0)/255;
	},
	/*
	* 将CSS颜色标记转换为颜色数组 [R, G, B, A]。
	* 返回一个4个元素的数组，每个元素均在0~1之间
	* 仅接受字符串类型参数
	* 处理方法：
	* 1. #fff/#ffff，以#ffffff或#ffffffff方式解读
	* 2. #ffffff/#ffffffff，转换为三组或四组数据，顺序为R G B A。A部分失缺按ff处理
	* 3. 5字补齐为6字，7字补齐为8字
	* 4. 大于8字取前8字；小于3字，例如#cc，按#ccccccff处理
	* 5. 井号不必需，读取时会掠过。
	*/
	FromCSS : function(v){
		if(typeof v != 'string' || !v.length) return null;
		if(v.charAt(0) == '#') v = v.substr(1);
		if(v.length < 3){
			return [v = this.ObjectToNumber(v), v, v, 1];
		}
		var reg;
		switch(v.length){
			case 3: case 4:
				reg = /[0-f]/ig;
				break;
			case 6: case 8:
				reg = /[0-f]{2}/ig;
				break;
			case 5: case 7:
				return this.FromCSS(v + v.charAt(v.length - 1));
			default:
				return this.FromCSS(v.substr(0, 8));
		}
		arr = []
		v.replace(reg,function(m){arr.push(ColorHelper.ObjectToNumber(m));});
		v = reg = null;
		return arr;
	},
	/* 返回一个0~1之间的数 */
	Fix : function(v){
		return typeof v != 'number' 
			? this.ObjectToNumber(v) 
			: this.Range(v > 1 ? v / 255 : v, 0, 1); 
	},
	/* 返回指定范围的数 */
	Range : function(v, mi, ma){
		return Math.max(mi, Math.min(ma, v))
	}
});
/* ColorHelper 对 ArrayHelper 的继承与重载 */
Inherit.inherit(ColorHelper, new ArrayHelper(), {
	/* 随机设置RGB三个值 */
	rand : function(){
		this.each(function(data, ii){
			data[ii] = Math.random();
		});
		this.set(1, 3);
	},
	/*
	* 重载set
	* 动态参数
	* 处理方式：
	* 1. 没有参数时，RGB归零，A=1
	* 2. 1个参数时，字符串类型则尝试转换为CSS颜色，数字类型则调用基类set方法赋值
	* 3. 2个或更多参数时，调用基类set方法赋值
	*/
	set : function(){
		var args = Array.prototype.slice.call(arguments, 0)
			, _set = ArrayHelper.prototype.set;
			;
		switch(args.length){
			case 0:
				this.clear();
				_set.apply(this, [1, 3]);
				break;
			case 1:
				if(typeof args[0] == 'string' && args[0].length){
					_set.call(this, ColorHelper.FromCSS(args[0]));
				} else if(typeof args[0] == 'number'){
					_set.call(this, ColorHelper.Fix(args[0]));
				}
				break;
			case 2:
				args[0] = ColorHelper.Fix(args[0]); 
				args[1] = typeof args[1] == 'number' ? ColorHelper.Range(args[1], 0, 3) : 0;
				_set.apply(this, args);
				break;
			default:
				var i = 0, len = args.length;
				for(; i < len; i++){
					args[i] = ColorHelper.Fix(args[i]); 
				}
				_set.call(this, args);
				break;
		}
		args = _set = null;
	}
});

function GroupHelper(count, model){
	this.data = [];
	this.array = [];
}
GroupHelper.prototype = {
	init : function(arg1, arg2){
		if(arg1 instanceof Array){
			this.attach(arg1);
		} else{
			this.add(arg1, arg2);
		}
	},
	add : function(count, model){
		if(typeof count == 'number' && count > 0 && model instanceof Array){
			if(typeof this.fix == 'function'){
				model = this.fix(model);
			}
			var offset = this.data.length;
			ArrayHelper.model(model, count, this.data);
			if(typeof this.creator == 'function'){
				for(var i = 0; i < count; i++){
					this.array.push(this.creator(this.data, offset));
					offset += model.length;
				}
			}
			offset = null;
		}
	},
	attach : function(arr){
		if(!(arr instanceof Array)) return;
		this.data = arr;
		this.array = [];
		if(typeof this.creator == 'function'){
			var o = this.creator();
			var step = Math.max(1, o.length || 1);
			o = null;
			for(var i = 0; i < this.data.length; i += step){
				this.array.push(this.creator(this.data, i));
			}
		}
	}
}

function ColorGroup(){ this.init(arguments[0], arguments[1]); }
Inherit.inherit(ColorGroup, new GroupHelper(), {
	fix : function(model){
		var oriLen = model.length;
		for(var i = 0; i < 4; i++){
			model[i] = ColorHelper.Fix(model[i]);
		}
		if(oriLen < 4){
			model[3] = 1;
		}
		model = model.slice(0, 4);
		oriLen = i = null;
		return model;
	},
	creator : function(data, offset){
		return new ColorHelper(data, offset);
	},
	rand : function(){
		for(var i = 0; i < this.array.length; i++){
			this.array[i].rand();
		}
		i = null;
	}
});

function CubeColors(){
	var cs = new ColorGroup(24, [.5, .5, .5, 1]);
	Inherit.extend(cs, {
		Front : function(a, b, c, d){ SET(cs, a, b, c, d, 0, 1, 2, 3); },
		Back : function(a, b, c, d){ SET(cs, a, b, c, d, 4, 5, 6, 7); },
		Top : function(a, b, c, d){ SET(cs, a, b, c, d, 8, 9, 10, 11); },
		Bottom : function(a, b, c, d){ SET(cs, a, b, c, d, 12, 13, 14, 15); },
		Right : function(a, b, c, d){ SET(cs, a, b, c, d, 16, 17, 18, 19); },
		Left : function(a, b, c, d){ SET(cs, a, b, c, d, 20, 21, 22, 23); }
	});
	return cs;
	
	function set(cs, i, v){
		typeof v == 'string' && cs.array[i].set(v);
	}
	function SET(cs, a, b, c, d, A, B, C, D){
		var v = 0;
		set(cs, A, v = a || v);
		set(cs, B, v = b || v);
		set(cs, C, v = c || v);
		set(cs, D, v = d || v);
		v = null
	}
}


/*
* VerticesHelper
* 顶点管理类
* by MK 2011-12-2
*/
function VerticesHelper(data, offset){
	this.attach(data, offset);
	this.length = 3;
}
/* VerticesHelper 对 ArrayHelper 继承和重载 */
Inherit.inherit(VerticesHelper, new ArrayHelper(), {
	/*
	* 将本区每个值增长一个值，实现顶点的移动
	* index有效时，对指定索引处赋值
	* index无效时，对本区全体赋值
	*/
	move : function(v, index){
		if(typeof v != 'number' && (!v || isNaN(v = parseFloat(v)))){
			v = 0;
		}
		if(typeof index == 'number'){
			this.set(this.get(index) * v, index);
		} else {
			this.each(function(data, ii, i){
				data[ii] += v;
			});
		}
	}
});

function VerticesGroup(){ this.init(arguments[0], arguments[1]); }
Inherit.inherit(VerticesGroup, new GroupHelper(), {
	fix : function(model){
		for(var i = 0; i < 3; i++){
			if(isNaN(model[i]) && isNaN(model[i] = Number(model[i]))){
				model[i] = 0;
			}
		}
		model = model.slice(0, 3);
		return model;
	},
	creator : function(data, offset){
		return new VerticesHelper(data, offset);
	}
});




function CubeVertices(){
	var vg = new VerticesGroup();
	vg.attach([
		// Front face
		-1.0, -1.0,  1.0,
		 1.0, -1.0,  1.0,
		 1.0,  1.0,  1.0,
		-1.0,  1.0,  1.0,
		
		// Back face
		-1.0, -1.0, -1.0,
		-1.0,  1.0, -1.0,
		 1.0,  1.0, -1.0,
		 1.0, -1.0, -1.0,
		
		// Top face
		-1.0,  1.0, -1.0,
		-1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0,
		 1.0,  1.0, -1.0,
		
		// Bottom face
		-1.0, -1.0, -1.0,
		 1.0, -1.0, -1.0,
		 1.0, -1.0,  1.0,
		-1.0, -1.0,  1.0,
		
		// Right face
		 1.0, -1.0, -1.0,
		 1.0,  1.0, -1.0,
		 1.0,  1.0,  1.0,
		 1.0, -1.0,  1.0,
		
		// Left face
		-1.0, -1.0, -1.0,
		-1.0, -1.0,  1.0,
		-1.0,  1.0,  1.0,
		-1.0,  1.0, -1.0
	]);
	vg.indices = [
		0,  1,  2,      0,  2,  3,    // front
		4,  5,  6,      4,  6,  7,    // back
		8,  9,  10,     8,  10, 11,   // top
		12, 13, 14,     12, 14, 15,   // bottom
		16, 17, 18,     16, 18, 19,   // right
		20, 21, 22,     20, 22, 23    // left
	]
	return vg;
}

/*
* TextureCoordHelper
* by MK 2011-12-3
*/
function TextureCoordHelper(data, offset){
	this.attach(data, offset);
	this.length = 2;
}
/* VerticesHelper 对 ArrayHelper 继承和重载 */
Inherit.inherit(TextureCoordHelper, new ArrayHelper(), {
	set : function(v1, v2){
		this.data[0 + this.offset] = n(v1);
		this.data[1 + this.offset] = n(v2);
		function n(v){
			return isNaN(v = typeof v == 'number' ? v : Number(v)) ? 0 : v;
		}
	}
});

function TextureCoordGroup(){ this.init(arguments[0], arguments[1]); }
Inherit.inherit(TextureCoordGroup, new GroupHelper(), {
	fix : function(model){
		for(var i = 0; i < 2; i++){
			if(isNaN(model[i]) && isNaN(model[i] = Number(model[i]))){
				model[i] = 0;
			}
		}
		model = model.slice(0, 2);
		return model;
	},
	creator : function(data, offset){
		return new TextureCoordHelper(data, offset);
	}
});

function CubeTextureCoords(){
	var tcg = new TextureCoordGroup([
		// Front
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Back
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Top
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Bottom
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Right
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Left
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0
	]);
	return tcg;
}