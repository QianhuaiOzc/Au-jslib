/*
* WebGLHelper
* 管理WebGL的辅助对象
*/
var WebGLHelper = {
	/* 根据ID定位DOM元素 */
	$ : function(id){
		return typeof id == 'string' ? document.getElementById(id) : id;
	},
	/* 获取canvas标记的WebGL对象 */
	$$ : function(canvas){
		if(!(canvas = this.$(canvas))
			|| canvas.nodeType != 1
			|| canvas.nodeName.toLowerCase() != 'canvas'
			){
			return null;
		} else {
			try{
				return canvas.getContext('experimental-webgl');
			} catch(ex){ return null; }
		}
	},
	/* 获取script标记中的代码 */
	getShaderScript : function(script){
		if(!(script = this.$(script))) return null;
		var source = '', child = script.firstChild;
		while(!!child){
			if(child.nodeType == 3){
				source += child.textContent;
			}
			child = child.nextSibling; 
		}
		child = script = null;
		return source;
	},
	/* 获取所有x-shader代码节点 */
	allScripts : function(){
		var arr = [], els = document.getElementsByTagName('script'), i = 0, len = els.length;
		for(; i < len; i++){
			if(!!els[i].type && els[i].type.toLowerCase().indexOf('x-shader/') >= 0){
				arr.push(els[i]);
			}
		}
		els = i = len = null;
		if(arr.length < 1){
			return arr = null
		} else {
			return arr;
		}
	},
	/*
	* 从所有代码节点中理出vertex和fragment两种代码
	* 返回一个对象{ vs:string, fs:string }
	* 如果有两个相同type的shader-script,较靠后的节点的内容会作为最终赋值
	*/
	documentShaders : function(){
		var scripts = this.allScripts(), i = 0, len = scripts.length
			shaders = {};
			;
		for(; i < len; i++){
			switch(scripts[i].type){
				case 'x-shader/x-fragment':
					shaders.fs = this.getShaderScript(scripts[i]);
					break;
				case 'x-shader/x-vertex':
					shaders.vs = this.getShaderScript(scripts[i]);
					break;
			}
		}
		return shaders;
	}
}
/* 场景设置对象 */
function MatrixHelper(gl, prog){
	this.gl = gl;
	this.prog = prog;
	this.matrix = Matrix.I(4);
}
MatrixHelper.prototype = {
	/* makePerspective */
	make : function(fovy, aspect, znear, zfar){
		this.ppm = Matrix.makePerspective(fovy, aspect, znear, zfar);
	},
	/* multMatrix */
	mult : function(m){
		this.matrix = this.matrix.x(m);
	},
	/* mvTranslate */
	trans : function(v){
		this.mult(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
	},
	/* setMatrixUniforms */
	set : function(){
		if(!!this.ppm){
			this.gl.uniformMatrix4fv(
				this.gl.getUniformLocation(this.prog, "uPMatrix")
				, false, new Float32Array(this.ppm.flatten())
			);
		}
		if(!!this.matrix){
			this.gl.uniformMatrix4fv(
				this.gl.getUniformLocation(this.prog, "uMVMatrix")
				, false, new Float32Array(this.matrix.flatten())
			); 
		}
	},
	/* mvRotate */
	rotate : function(angle, v){
		var m = Matrix.Rotation(angle * Math.PI / 180.0, $V([v[0], v[1], v[2]])).ensure4x4();
		this.mult(m);
	}
}
/*
* iWebGL
* 构造函数动态接收参数
* 参数为一个时,认为该参数为canvas对象或者对象的id,并调用init方法初始化gl属性和program属性
* 多于一个时,后面的参数将被传递到clear方法
*/
function iWebGL(){
	var args = Array.prototype.slice.call(arguments, 0), id = args.shift();
	this.init(id);
	if(args.length > 0){
		this.clear.apply(this, args);
	}
	args = null;
}
iWebGL.prototype = {
	/* 返回WebGL对象的canvas容器 */
	canvas : function(){
		return !this.gl ? null : this.gl.canvas;
	},
	/* 返回绘制区域宽度 */
	w : function(){
		return !this.gl ? -1 : this.gl.drawingBufferWidth;
	},
	/* 返回绘制区域高度 */
	h : function(){
		return !this.gl ? -1 : this.gl.drawingBufferHeight;
	},
	/* 返回绘制区域宽高比率 */
	r : function(){
		return this.w() / this.h();
	},
	/* 初始化WebGL/Program/Matrix属性 */
	init : function(id){
		this.matrix = null;
		this.gl = WebGLHelper.$$(id);
		if(!!this.gl){
			this.matrix = new MatrixHelper(
				this.gl,
				this.program = this.gl.createProgram()
				);
		}
	},
	/* 重置绘图区域颜色/景深/遮挡关系等设置 */
	clear : function(){
		var args = Array.prototype.slice.call(arguments, 0),
			r = args.shift() || 0,
			g = args.shift() || 0,
			b = args.shift() || 0,
			a = args.shift(),
			depth = args.shift();
		if(typeof a != 'number') a = 1;
		if(typeof depth != 'number') depth = 1;
		
		with(this.gl){
			clearColor(r, g, b, a);  
			clearDepth(depth);
			enable(DEPTH_TEST); 
			depthFunc(LEQUAL);
		}
		
		args = r = g = b = a = depth = null;
	},
	/* 刷新显示缓存 */
	fresh : function(){
		//this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.gl.clear(16640);
	},
	/* 
	* 调用Shader脚本
	* 可接受参数类型为两种情况
	* 1.无参数.这时会在页面中搜寻script标记并加载.
	* 2.两个参数,即shader形参形式,分别加载vertex和fragment两种代码字符串
	*/
	shader : function(vert, frag){
		if(arguments.length == 0){
			var ss = WebGLHelper.documentShaders();
			vert = ss.vs;
			frag = ss.fs;
			ss = null;
		}
		if(!!vert && typeof vert == 'string' && !!frag && typeof frag == 'string'){
			var _ = this;
			with(this.gl){
				_.vs = createShader(VERTEX_SHADER);
				shaderSource(_.vs, vert);
				compileShader(_.vs);
				
				_.fs = createShader(FRAGMENT_SHADER);
				shaderSource(_.fs, frag);
				compileShader(_.fs);
				
				attachShader(_.program, _.vs);
				attachShader(_.program, _.fs);
				linkProgram(_.program);
				useProgram(_.program);
			}
			_ = null;
		}
	},
	/* 定位Shaper脚本中变量句柄 */
	param : function(argName){
		if(!argName || typeof argName != 'string') return;
		this.gl.enableVertexAttribArray(
			this[argName] = this.gl.getAttribLocation(this.program, argName)
		);
	},
	/*
	* 调用param方法定位参数后
	* 返回一个传递顶点数据的方法
	* 该方法指定了实例中define方法对应定点数据的参数
	*/
	paramVertices : function(argName){
		this.param(argName);
		var _ = this;
		return {
			define : function(data){
				_.define(data, _.gl.ARRAY_BUFFER, 'Float32', _.gl.STATIC_DRAW, argName, 3, _.gl.FLOAT);
			}
		}
	},
	/*
	* 调用param方法定位参数后
	* 返回一个传递颜色数据的方法
	* 该方法指定了实例中define方法对应颜色数据的参数
	*/
	paramColors : function(argName){
		this.param(argName);
		var _ = this;
		return {
			define : function(data){
				_.define(data, _.gl.ARRAY_BUFFER, 'Float32', _.gl.STATIC_DRAW, argName, 4, _.gl.FLOAT);
			}
		}
	},
	/*
	* 调用param方法定位参数后
	* 返回一个传递元素顶点数据的方法
	* 该方法指定了实例中define方法对应元素顶点数据的参数
	*/
	paramVerticesIndex : function(argName){
		this.param(argName);
		var _ = this;
		return {
			define : function(data){
				_.define(data
					, _.gl.ELEMENT_ARRAY_BUFFER
					, 'Uint16'
					, _.gl.STATIC_DRAW
					, argName
					, 3
					, _.gl.UNSIGNED_SHORT
					);
			}
		}
	},
	define : function(data, bindType, arrayType, drawType, argName, group, pointerType){
		with(this.gl){
			bindBuffer(bindType, createBuffer());
			bufferData(bindType, new window[arrayType + 'Array'](data), drawType);
			if(!!argName && typeof argName == 'string'){
				vertexAttribPointer(this[argName], group, pointerType, false, 0, 0);
			}
		}
	},
	/*
	* 参数化绘制
	*/
	draw : function(method, drawType, count, dataType){
		this.fresh();
		this.matrix.set();
		this.gl[method](drawType, count, dataType, 0);
	},
	/* 绘制立方体,调用draw方法并指定绘制的相关参数 */
	drawCube : function(){
		this.draw('drawElements', 4, 36, 5123, 0);
	}
}