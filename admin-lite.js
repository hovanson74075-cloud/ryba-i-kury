let products = [];

async function load() {
  try {
    const res = await fetch('products.json', { cache: 'no-store' });
    products = await res.json();
  } catch {
    products = [];
  }
  render();
}

function render(){
  const TBL = document.querySelector('#tbl tbody');
  TBL.innerHTML = '';
  products.forEach(p => TBL.appendChild(row(p)));
}

function row(p){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="inline id" value="${p.id}"></td>
    <td><input class="inline name" value="${p.name}"></td>
    <td><input class="inline category" value="${p.category}"></td>
    <td><input class="inline unit" value="${p.unit}"></td>
    <td><input class="inline price" type="number" value="${p.price}"></td>
    <td><input class="inline img" value="${p.img||''}"></td>
    <td>
      <button class="save">Ок</button>
      <button class="danger del">Удалить</button>
    </td>`;
  tr.querySelector('.save').addEventListener('click', ()=>{
    p.id = tr.querySelector('.id').value.trim();
    p.name = tr.querySelector('.name').value.trim();
    p.category = tr.querySelector('.category').value.trim();
    p.unit = tr.querySelector('.unit').value.trim();
    p.price = Number(tr.querySelector('.price').value);
    p.img = tr.querySelector('.img').value.trim();
  });
  tr.querySelector('.del').addEventListener('click', ()=>{
    products = products.filter(x => x !== p);
    render();
  });
  return tr;
}

document.getElementById('addBtn').addEventListener('click', ()=>{
  const id = document.getElementById('new_id').value.trim();
  const name = document.getElementById('new_name').value.trim();
  const category = document.getElementById('new_category').value.trim();
  const unit = document.getElementById('new_unit').value.trim();
  const price = Number(document.getElementById('new_price').value);
  const img = document.getElementById('new_img').value.trim();
  if(!id || !name || !category || !unit || !price){ alert('Заполните поля'); return; }
  products.push({ id, name, category, unit, price, img });
  ['new_id','new_name','new_category','new_unit','new_price','new_img'].forEach(id=>document.getElementById(id).value='');
  render();
});

document.getElementById('downloadBtn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  try{
    const arr = JSON.parse(text);
    if(!Array.isArray(arr)) throw new Error('not array');
    products = arr;
    render();
  }catch(err){
    alert('Ошибка чтения JSON: ' + err.message);
  }
});

load();
