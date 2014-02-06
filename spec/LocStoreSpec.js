describe("LocStore", function() {
  
  localStorage.clear()



  var mydata = {
    str: 'string property',
    obj: { a: 'a', b: 'bb' },
    rec: { first:'first', obj: { 0:0, 1:1 } },
    arr: [1, 2, 555, 'string element', 9, {from:'array',index:5}],
    nul: null,
    und: undefined,
    num: 777
  }
  var mystore = null

  var init = function(){
    localStorage.setItem('mystore', JSON.stringify(mydata))
    mystore = LocStore('mystore')
  }

  init()
 

  it('create instance', function() {
    expect(new LocStore() instanceof LocStore).toBe(true)
    expect(LocStore() instanceof LocStore).toBe(true)
  })

  it('restore data by name', function() {
    expect(LocStore('mystore').get()).toEqual(mydata)
    expect(LocStore('fakestore').get()).toBe(null)
  })

 

  describe("LocStore get", function() {

    it('get primitive property', function() {
      expect(mystore.get('str')).toBe('string property')
      expect(mystore.get('str',3)).toBe('i')
      expect(mystore.get('nul')).toBe(null)
      expect(mystore.get('num')).toBe(777)
      expect(mystore.get('und')).toBe(undefined)
      expect(mystore.get('obj','a')).toBe('a')
      expect(mystore.get('obj','b')).toBe('bb')
      expect(mystore.get('arr','2')).toBe(555)
      expect(mystore.get('arr','3')).toBe('string element')
      expect(mystore.get('arr','5','index')).toBe(5)
    })

    it('get objective property', function() {
       expect(mystore.get('arr','5')).toEqual(mydata.arr[5])
       expect(mystore.get('rec','obj')).toEqual(mydata.rec.obj)
    })

    it('get undefined property', function() {
      expect(mystore.get('arr','20')).toBe(undefined)
      expect(mystore.get('arr','fakeprop')).toBe(undefined)
      expect(mystore.get('fake')).toBe(undefined)
      expect(mystore.get('num',7)).toBe(undefined)
      expect(mystore.get('a','b','c')).toBe(undefined)
    })

  })


  describe("LocStore set", function() {

    it('set property', function() {
      mystore.set('obj','c','C-value')
      expect(mystore.get('obj','c')).toBe('C-value')

      mystore.set('obj','d','deep','deep value')
      expect(mystore.get('obj','d')).toEqual({ deep: 'deep value' })

      mystore.set('obj','c','deep',undefined)
      expect(mystore.get('obj','c','deep')).toBe(undefined)

      mystore.set('obj','c','deep',null)
      expect(mystore.get('obj','c','deep')).toBe(null)

      mystore.set('a','b','c',undefined)
      expect(mystore.get('a')).toEqual({ b: { c: undefined } })

      mystore.set('a',undefined)
      expect(mystore.get('a')).toBe(undefined)
    })

    

    it('merge property', function() {
      init()

      mystore.merge('obj', { b: 'bobo', c: 'ccc' })
      expect(mystore.get('obj')).toEqual({ a: 'a', b: 'bobo', c: 'ccc' })

      mystore.merge('arr', { 0: 111 })
      expect(mystore.get('arr',0)).toBe(111)

      mystore.merge('deep', 'deep', { value: 'deep' })
      expect(mystore.get('deep','deep')).toEqual({ value: 'deep' })

    })

  })

})