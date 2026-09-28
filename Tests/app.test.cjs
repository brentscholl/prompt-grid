const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../Web/app.js'), 'utf8');

// Execute real app code against isolated DOM/storage boundaries, never user data.
function app(saved) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value:'', innerHTML:'', textContent:'', listeners:{}, classList:{add(){},remove(){}},
      addEventListener(type, listener) { this.listeners[type] = listener; },
      querySelectorAll() { return []; }, querySelector: key => element(key),
      showModal(){}, close(){}, focus(){},
    });
    return elements.get(id);
  };
  let stored = saved === undefined ? null : JSON.stringify(saved);
  const messages = [];
  const context = vm.createContext({
    document:{querySelector:element,addEventListener(){},body:element('body')},
    window:{addEventListener(){}},
    localStorage:{getItem:()=>stored,setItem:(_,value)=>{stored=value;}},
    webkit:{messageHandlers:{promptGrid:{postMessage:value=>messages.push(value)}}},
    crypto:{randomUUID:()=> 'new-test-card'},
    FormData:class {get(){return element('selected-color').value;}},
    requestAnimationFrame(){},cancelAnimationFrame(){},setTimeout(){},clearTimeout(){},Date,
  });
  vm.runInContext(source, context);
  return {element,messages,run:code=>vm.runInContext(code,context),
    stored:()=>JSON.parse(stored),submit:()=>element('#prompt-form').listeners.submit({preventDefault(){}})};
}

test('fresh install has only generic examples',()=>{
  const ui=app();
  assert.equal(ui.stored().length,3);
  assert.ok(ui.stored().every(p=>p.id.startsWith('starter-') && p.color));
});
test('legacy colors survive reorder and reload',()=>{
  const ui=app([{id:'a',title:'A',body:'alpha'},{id:'b',title:'B',body:'beta'}]);
  assert.deepEqual(ui.stored().map(p=>p.color),['indigo','emerald']);
  ui.run('prompts.reverse(); savePrompts(); renderPrompts();');
  assert.deepEqual(app(ui.stored()).stored().map(p=>p.color),['emerald','indigo']);
});
test('create and edit persist the selected color',()=>{
  const ui=app([]);ui.run('openAddDialog()');
  ui.element('#prompt-title').value='Example';ui.element('#prompt-body').value='Hello';
  ui.element('selected-color').value='teal';ui.submit();
  assert.equal(ui.stored()[0].color,'teal');
  ui.run('openEditDialog("new-test-card")');
  assert.match(ui.element('#prompt-colors').innerHTML,/value="teal" checked/);
  ui.element('selected-color').value='rose';ui.submit();
  assert.equal(ui.stored()[0].color,'rose');assert.equal(ui.stored()[0].body,'Hello');
});
test('cancel leaves saved text and color untouched',()=>{
  const ui=app([{id:'a',title:'A',body:'alpha',color:'amber'}]);
  ui.run('openEditDialog("a")');ui.element('#prompt-title').value='Changed';
  ui.element('selected-color').value='rose';ui.run('closeDialog()');
  assert.equal(ui.stored()[0].title,'A');assert.equal(ui.stored()[0].color,'amber');
});
test('copy adds one trailing space without altering stored text',async()=>{
  const ui=app([{id:'a',title:'A',body:'alpha  \n',color:'teal'}]);
  await ui.run('pastePrompt("a")');
  assert.equal(ui.messages.at(-1).text,'alpha ');
  assert.equal(ui.run('prompts[0].body'),'alpha  \n');
});
test('card markup is escaped',()=>{
  const ui=app([{id:'a',title:'<img src=x>',body:'<script>alert(1)</script>',color:'sky'}]);
  const html=ui.element('#prompt-grid').innerHTML;
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
});
test('drop commits preview; cancel preserves original order and color',()=>{
  for(const commit of [false,true]) {
    const ui=app([{id:'a',title:'A',body:'alpha',color:'teal'},{id:'b',title:'B',body:'beta',color:'rose'}]);
    ui.run(`pointerDrag={isDragging:true,control:{hasPointerCapture:()=>false},ghost:{remove(){}},
      order:[{dataset:{dragId:'b'}},{dataset:{dragId:'a'}}]};finishDragging(${commit});`);
    assert.equal(ui.run('prompts.map(p=>p.id).join(",")'),commit?'b,a':'a,b');
    assert.equal(ui.run('prompts.find(p=>p.id==="a").color'),'teal');
    assert.equal(ui.run('pointerDrag'),null);
  }
});
