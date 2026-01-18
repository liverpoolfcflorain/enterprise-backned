const graphButton = document.querySelector(".graph-button");

graphButton.addEventListener('click', () => {
    graphButton.innerHTML = '<canvas id="myChart" width="200" height="100"></canvas>';
    createGraph();
    console.log('Graph button clicked!');
});


function createGraph(){
    const ctx = document.getElementById('myChart').getContext('2d');
    const myChart = new Chart(ctx, {
    type: 'line', // or 'bar', 'pie', etc.
    data: {
        labels: ['1', '2', '3', '4', '5'],
        datasets: [{
            label: 'Asset Price',
            data: [12,43,546,23,65],
            borderColor: 'rgba(75, 192, 192, 0)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true
        }]
    },
    options: {
        responsive: true
    }
});
}

