const apiUrl = 'https://api.eclesiar.com/server/status'; // <-- Podmień na swoje API

let lastApiData = null;

// Zapisz klucz API do localStorage
document.getElementById('saveKeyBtn').onclick = () => {
  const key = document.getElementById('apiKeyInput').value;
  localStorage.setItem('apiKey', key);
  alert('Klucz zapisany!');
};

// Rejestracja service workera
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}

let queries = [];

// Załaduj listę zapytań z pliku JSON
async function loadQueries() {
  const response = await fetch('queries.json');
  queries = await response.json();
  const select = document.getElementById('querySelect');
  select.innerHTML = '';
  queries.forEach((q, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = q.name;
    select.appendChild(option);
  });
  renderParams();
}

// Renderuj pola do parametrów
function renderParams() {
  const select = document.getElementById('querySelect');
  const paramsContainer = document.getElementById('paramsContainer');
  paramsContainer.innerHTML = '';
  const query = queries[select.value];
  if (query && query.params) {
    query.params.forEach(param => {
      const label = document.createElement('label');
      label.textContent = param.label + ': ';
      const input = document.createElement('input');
      input.type = param.type || 'text';
      input.id = 'param_' + param.name;
      label.appendChild(input);
      paramsContainer.appendChild(label);
      paramsContainer.appendChild(document.createElement('br'));
    });
  }
}

// Obsługa zmiany zapytania
document.getElementById('querySelect').addEventListener('change', renderParams);

document.getElementById('fetchBtn').onclick = async () => {
  const apiKey = localStorage.getItem('apiKey');
  if (!apiKey) {
    alert('Najpierw wpisz i zapisz klucz API!');
    return;
  }
  const select = document.getElementById('querySelect');
  const query = queries[select.value];
  if (!query) {
    alert('Wybierz zapytanie!');
    return;
  }

  // Buduj parametry do query string
  let url = query.url;
  let params = '';
  if (query.params) {
    const searchParams = new URLSearchParams();
    query.params.forEach(param => {
      const value = document.getElementById('param_' + param.name).value;
      if (value) searchParams.append(param.name, value);
    });
    if (searchParams.toString()) {
      url += '?' + searchParams.toString();
    }
  }

  // Dodaj proxy na początek
  const proxyUrl = 'https://corsproxy.io/?' + url;

  try { 
    console.log(proxyUrl)
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Błąd HTTP: ' + response.status);
    }

    const result = await response.json();
    console.log('Odpowiedź z API:', result);

    if (result.code !== 200) {
      throw new Error('Błąd API: ' + result.description);
    }

lastApiData = result.data; // <-- zapisz dane do eksportu
updateOutput();

    //document.getElementById('output').textContent = JSON.stringify(result.data, null, 2);

  } catch (err) {
    document.getElementById('output').textContent = 'Błąd: ' + err.message;
    console.error(err);
  }
};

document.getElementById('exportBtn').onclick = () => {
  if (!lastApiData || !Array.isArray(lastApiData) || lastApiData.length === 0) {
    alert('Brak danych do eksportu!');
    return;
  }

  // Pobierz klucze z pierwszego obiektu (nagłówki)
  const headers = Object.keys(lastApiData[0]);
  const csvRows = [];

  // Dodaj nagłówki
  csvRows.push(headers.join(','));

  // Dodaj wiersze
  lastApiData.forEach(obj => {
    const row = headers.map(h => {
      let val = obj[h];
      // Jeśli pole jest obiektem lub tablicą, zamień na JSON
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      // Escape cudzysłowy
      if (typeof val === 'string' && val.includes('"')) {
        val = val.replace(/"/g, '""');
      }
      // Jeśli pole zawiera przecinek, cudzysłów lub enter, otocz w cudzysłowy
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(row.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  // Tworzymy tymczasowy link do pobrania
  const a = document.createElement('a');
  a.href = url;
  a.download = 'export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function updateOutput() {
  const asTable = document.getElementById('viewSwitch').checked;
  const pre = document.getElementById('output');
  const tableDiv = document.getElementById('tableOutput');

  if (!lastApiData) {
    pre.textContent = '';
    tableDiv.innerHTML = '';
    tableDiv.style.display = 'none';
    pre.style.display = '';
    return;
  }

  if (asTable && Array.isArray(lastApiData) && lastApiData.length > 0) {
    // Wyświetl jako tabela
    const headers = Object.keys(lastApiData[0]);
    let html = '<table border="1" style="border-collapse:collapse"><thead><tr>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';
    lastApiData.forEach(row => {
      html += '<tr>';
      headers.forEach(h => {
        let val = row[h];
        if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        html += `<td>${val}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    tableDiv.innerHTML = html;
    tableDiv.style.display = '';
    pre.style.display = 'none';
  } else {
    // Wyświetl jako JSON
    pre.textContent = JSON.stringify(lastApiData, null, 2);
    pre.style.display = '';
    tableDiv.style.display = 'none';
  }
}

document.getElementById('viewSwitch').addEventListener('change', updateOutput);

// Załaduj zapytania przy starcie
window.addEventListener('DOMContentLoaded', loadQueries);