/*
Объект LocStore применяется для "сквозного" получения и назначения свойств объекта

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
		} else {
			this.data = {}
		}
		this.handlers = []
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
	LocStore.prototype.getProp = function(props){
		var cur = this;
		[].splice.call(props,0,0,'data')
		var len = props.length
		for (var i=0; i<len; ++i) {
			var prop = String(props[i])
			if (typeof(cur[prop])!='object' || cur[prop]==null) {
				if (i == len-1) return cur[prop]
				else return;
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
		if (!args.length) {
			return
		} else if (typeof(args[0])=='object' && args[1]) {
			this.setProp(args[0],args[1],merge)
		} else {
			var props = [].slice.call(args,0,-1)
			this.setProp(props,args[args.length-1],merge)
		}
		return this.data
	}

	LocStore.prototype.setProp = function(props,val,merge){
		var len = props.length
		var cur = this
		props.splice(0,0,'data')
		for (var i=0; i<len; ++i) {
			var prop = String(props[i])
			if (typeof(cur[prop])!='object' || cur[prop]==null) {
				cur[prop] = {}
			}
			cur = cur[prop]
		}
		if (cur[props[len]] === val) return
		var preval = cur[props[len]]
		if (merge) {
			if (typeof(cur[props[len]])!='object' || cur[props[len]]==null) cur[props[len]]={}
			this.mergeRecursive(cur[props[len]],val,props.slice(1))  // merge
		} else {
			cur[props[len]] = val // set
			if (this instanceof LocStore) this.emit(props.slice(1).join('::'),val,preval)
		}
		
	}

	LocStore.prototype.emit = function(props,val,preval){
		var self = this
		var handlers = self.handlers[props]
		handlers && handlers.forEach(function(handler){
			handler.call(self,val,preval)
		})
	}

	LocStore.prototype.bind = function(hash,handler){
		if (!handler) return this
		this.handlers[hash] = this.handlers[hash]||[]
		this.handlers[hash].push(handler)
		return this
	}

	LocStore.prototype.unbind = function(hash,handler){
		if (handler) {
			var pos = this.handlers[hash].indexOf(handler)
			if (pos!=-1) {
				this.handlers[hash].splice(pos,1)
				return handler
			} else return false
		} else {
			var deleted = this.handlers[hash]
			this.handlers[hash] = []
			return deleted
		}
	}

	LocStore.prototype.mergeRecursive = function (obj1, obj2, props) {
		for (var p in obj2) {
			var props_p = props.concat([p])
			if (
				(typeof(obj2[p])=='object' && obj2[p]!=null) &&
				(typeof(obj1[p])=='object' && obj1[p]!=null)
			) {
				obj1[p] = this.mergeRecursive(obj1[p], obj2[p], props_p)
			} else {
				var preval = obj1[p]
				obj1[p] = obj2[p]
				this.emit(props_p.join('::'),obj2[p],preval)
			}
		}
		return obj1
	}

	LocStore.prototype.save = function(){
		if (this.name)
			Source.set(this.name,this.data)
		return this.data
	}

	LocStore.get = function(){
		var store = {
			name: arguments[0]
		}
		if (store.name) {
			if (typeof(store.name)=='string') {
				store.data = Source.get(store.name)
			} else {
				store.data = store.name
			}
			return this.prototype.getProp.bind(store)([].slice.call(arguments,1))
		} else return
	}

	LocStore.set = function(){
		var store = {
			name: arguments[0]
		}
		if (store.name) {
			if (typeof(store.name)=='string') {
				store.data = Source.get(store.name)
			} else {
				store.data = store.name
				delete store.name
			}
			this.prototype.setProp.bind(store)([].slice.call(arguments,1,-1),arguments[arguments.length-1])
			this.prototype.save.bind(store)()
			return store.data
		} else return
	}

	var NODE_ENV = false

	var Source = {
		get: function(target){
			try{
				return NODE_ENV
					   ? JSON.parse(require('fs').readFileSync(target))
					   : JSON.parse(localStorage.getItem(target))
			} catch(err){
				console.log(err)
				return {}
			}
		},
		set: function(target,data){
			return NODE_ENV
				   ? require('fs').writeFile(target, JSON.stringify(data,null,'\t'))
				   : localStorage.setItem(target,JSON.stringify(data))
		},
	}

	//Export the LocStore object for Node.js
	if (typeof exports !== 'undefined') {
		NODE_ENV = true
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = LocStore
		}
		exports.LocStore = LocStore
	} else { //for Browser
		window.LocStore = LocStore
	}

})()