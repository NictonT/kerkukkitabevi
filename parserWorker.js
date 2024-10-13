importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js');

self.addEventListener('message', function(e) {
    const csvData = e.data;
    Papa.parse(csvData, {
        header: true,
        complete: function(results) {
            self.postMessage(results.data);
        },
        error: function(err) {
            self.postMessage({ error: err.message });
        }
    });
});
