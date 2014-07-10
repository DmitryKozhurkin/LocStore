/*

Предназначен для удобной работы со свойствами объектов или конфигов
 * сквозное получение и назначение значений
 * испускание событий на изменение значений
 * функции обработки данных перед сохранением

Пример:
	var obj = {
		settings: {
			host: '196.168.56.1'
		}
	};
	LocStore.get(obj,'settings','host'); // вернет '196.168.56.1'
	LocStore.get(obj,'settings','port'); // вернет undefined

Пример:
	var obj = {};
	LocStore.set(obj,'a','b','c','Hello!');
	console.log(obj) // {"a":{"b":{"c":"Hello!"}}}
	
*/

(function(){

	var LocStore = function(target,sync){
		if (!(this instanceof LocStore)){
			return new LocStore(target,sync)
		}
		if (typeof(target)=='object') { // если передать объект то он будет использован как данные
			this.data = target
		} else if (typeof(target)=='string') { // если передать строку то данные будут извлечены из localStorage или из файла в зависимости от окружения
			this.name = target
			this.data = Source.get(target)
			this.filters = []
		} else {
			this.data = {}
		}
		this.handlers = []
	}

	LocStore.prototype.addFilter = function(func){
		this.filters.push(func)
	}

	LocStore.prototype.clearFilters = function(func){
		this.filters = []
	}

	LocStore.prototype.get = function(){
		if (!arguments.length) {
			return this.data
		} else if (typeof(arguments[0])=='object') {
			return this.getProp(arguments[0])
		} else {
			return this.getProp(arguments)
		}
	}

	LocStore.prototype.getLast = function(){
		return this.returned
	}

	LocStore.prototype.getProp = function(props){
		var cur = this;
		[].splice.call(props,0,0,'data')
		var len = props.length
		for (var i=0; i<len; ++i) {
			var prop = String(props[i])
			if (!isObject(cur[prop]) && typeof(cur[prop])!='string') {
				if (i == len-1) return cur[prop]
				else return
			}
			cur = cur[prop]
		}
		return cur
	}

	LocStore.prototype.set = function(){
		return this.parseArgs(arguments)
	}

	LocStore.prototype.merge = function(){
		return this.parseArgs(arguments,true)
	}

	LocStore.prototype.parseArgs = function(args,merge){
		if (args.length==0) return
		
		if ((args[0] instanceof Array) && args.length==2) {
			this.setProp(args[0],args[1],merge)
		} else {
			var props = [].slice.call(args,0,-1)
			this.setProp(props,args[args.length-1],merge)
		}
		return this
	}

	LocStore.prototype.setProp = function(props,val,merge){
		var len = props.length
		var cur = this
		var emits = []
		props.splice(0,0,'data')
		for (var i=0; i<len; ++i) {
			var prop = String(props[i])
			if (!isObject(cur[prop])) {
				var preval = cur[prop]
				cur[prop] = {}
				emits.push([props.slice(0,+i+1).join('::'), cur[prop], preval])
			}
			cur = cur[prop]
		}
		if (cur[props[len]] === val) {
			this.returned = val
			return
		}
		var preval = cur[props[len]]

		if (merge) {
			if (!isObject(preval)) cur[props[len]]={}
			this.mergeRecursive(cur[props[len]], val, {
				props: props,
				emits: emits
			})  // merge
			if (!isObject(preval)) emits.push([props.join('::'), cur[props[len]], preval])
			this.returned = cur[props[len]]
		} else {
			cur[props[len]] = val // set
			
			if (isObject(preval)) {
				this.mergeRecursive(preval, val, {
					props: props,
					emits: emits,
					clean: true
				})
			} else if (isObject(val)) {
				this.mergeRecursive({}, val, {
					props: props,
					emits: emits,
					clean: true
				})
			}
			emits.push([props.join('::'), val, preval])
			this.returned = val
		}

		for (var i in emits) this.emit.apply(this, emits[i])
	}

	LocStore.prototype.emit = function(hash,val,preval){
		var self = this
		console.log('####', JSON.stringify(arguments,null,2))
		var handlers = self.handlers[hash]
		handlers && handlers.forEach(function(handler){
			handler.call(self,val,preval)
		})
		var all = self.handlers['all']
		all && all.forEach(function(handler){
			handler.call(self,hash,val,preval)
		})
		return this
	}

	LocStore.prototype.bind = function(hash,handler){
		if (typeof(handler)=='function') {
			this.handlers[hash] = this.handlers[hash]||[]
			this.handlers[hash].push(handler)
		}
		return this
	}

	LocStore.prototype.unbind = function(hash,handler){
		if (typeof(handler)=='function') {
			var pos = this.handlers[hash].indexOf(handler)
			if (pos!=-1) this.handlers[hash].splice(pos,1)
		} else if (!handler) {
			this.handlers[hash] = []
		}
		return this
	}

	LocStore.prototype.mergeRecursive = function (obj1, obj2, options) {
		if (options.clean) this.cleanRecursive(obj1, obj2, {
			props: options.props,
			emits: options.emits
		})
		if (isObject(obj2)) for (var p in obj2) {
			var props_inc = options.props&&options.props.concat([p])
			if (isObject(obj2[p]) && isObject(obj1[p])) {
				obj1[p] = this.mergeRecursive(obj1[p], obj2[p], {
					props: props_inc,
					emits: options.emits,
					clean: options.clean 
				})
			} else {
				var preval = obj1[p]
				if (!options.clean) obj1[p] = obj2[p]
								
				if (isObject(preval)) this.cleanRecursive(preval, {}, { 
					props: props_inc,
					emits: options.emits
				})
				if (isObject(obj2[p])) {
					this.mergeRecursive({}, obj2[p], { 
						props: props_inc,
						emits: options.emits,
						clean: true
					})
				}

				if (props_inc && (obj2[p]!==preval))
					options.emits.push([props_inc.join('::'), obj2[p], preval]) //this.emit(props_inc.join('::'), obj2[p], preval)

			}
		}
		return obj1
	}

	LocStore.prototype.cleanRecursive = function (obj1, obj2, options) {
		var keys = isObject(obj2) ? Object.keys(obj2) : []
		for (var p in obj1) {
			if (keys.indexOf(p)==-1) {
				var props_inc = options.props&&options.props.concat([p])
				//delete obj1[p]
				var preval = obj1[p]
				if (isObject(preval)) this.cleanRecursive(preval, {}, {
					props: props_inc,
					emits: options.emits
				})
				if (props_inc) options.emits.push([props_inc.join('::'), undefined, preval]) //this.emit(props_inc.join('::'), undefined, preval)
			}
		}
	}

	LocStore.prototype.save = function(){
		if (arguments.length) this.set.apply(this,arguments)
		var self = this;
		if (self.name) {
			var i = 0;
			var next = function(data){
				self.data = data||self.data;
				var filter = (self.filters||[])[i++];
				if (filter) {
					filter(self.data,next)
				} else {
					Source.set(self.name,self.data)
				} 
			}
			next(self.data)
		}
	}

	var isObject = function(obj){
		return (typeof(obj)=='object' && obj!=null)
	}

	LocStore.get = function(){

		if (arguments.length==0) return

		var store = LocStore(arguments[0])
		
		return store.get.apply(store, [].slice.call(arguments,1))
	}

	LocStore.set = function(){

		if (arguments.length<2) return
		if (isObject(arguments[0]) && arguments.length<2) return

		var store = LocStore(arguments[0])
		store.set.apply(store, [].slice.call(arguments,1))
		store.save()

		return store
	}

	//LocStore.merge

	var Source = {
		get: function(target){
			try{
				if (NODE_ENV) return JSON.parse(require('fs').readFileSync(target))
				else {
					var val = localStorage.getItem(target)
					return (val=='undefined') ? undefined : JSON.parse(val)
				}
			} catch(err){
				console.error('get data error:',err)
				return {}
			}
		},
		set: function(target,data){
			return NODE_ENV
				   ? require('fs').writeFile(target, JSON.stringify(data,null,'\t'))
				   : localStorage.setItem(target,JSON.stringify(data))
		},
	}

	var NODE_ENV;

	//Export the LocStore object for Node.js
	if (typeof exports !== 'undefined') {
		NODE_ENV = true
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = LocStore
		}
		exports.LocStore = LocStore
	} else { //for Browser
		NODE_ENV = false
		window.LocStore = LocStore
	}

})()