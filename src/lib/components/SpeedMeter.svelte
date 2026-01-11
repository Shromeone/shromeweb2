<script>
    let { value = 0, max = 1000, min = 0.1, label = "Hits/Sec" } = $props();
    
    let canvas;
    /** @type {CanvasRenderingContext2D} */
    let ctx;
    
    // Logarithmic scaling function
    function logScale(val, minVal, maxVal) {
        if (val <= 0) return 0;
        const logMin = Math.log10(minVal);
        const logMax = Math.log10(maxVal);
        const logVal = Math.log10(val);
        return (logVal - logMin) / (logMax - logMin);
    }
    
    $effect(() => {
        if (canvas) {
            ctx = canvas.getContext('2d');
            drawSpeedometer();
        }
    });
    
    function drawSpeedometer() {
        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.45;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw outer circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI, true);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#333';
        ctx.stroke();
        
        // Draw inner circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.95, 0, Math.PI, true);
        ctx.stroke();
        
        // Draw segments
        const segmentCount = 10;
        for (let i = 0; i <= segmentCount; i++) {
            const angle = Math.PI * (1 - i / segmentCount);
            const startX = centerX + Math.cos(angle) * radius * 0.95;
            const startY = centerY + Math.sin(angle) * radius * 0.95;
            const endX = centerX + Math.cos(angle) * radius;
            const endY = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#666';
            ctx.stroke();
        }
        
        // Draw colored segments (green to red)
        const colors = ['#00ff00', '#77ff00', '#ffff00', '#ff7700', '#ff0000'];
        for (let i = 0; i < 5; i++) {
            const startAngle = Math.PI * (1 - (i * 2) / 10);
            const endAngle = Math.PI * (1 - ((i + 1) * 2) / 10);
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.9, startAngle, endAngle, true);
            ctx.lineWidth = 10;
            ctx.strokeStyle = colors[i];
            ctx.stroke();
        }
        
// Draw value text
ctx.font = '16px Arial';
ctx.fillStyle = '#fff';
ctx.textAlign = 'center';
ctx.fillText(`${value.toFixed(1)} ${label}`, centerX, centerY - 10);

// Draw logarithmic scale labels
ctx.font = '12px Arial';
ctx.fillStyle = '#ccc';
ctx.textAlign = 'center';

// Calculate logarithmic tick positions
const logMin = Math.log10(min);
const logMax = Math.log10(max);
const tickCount = 5;

for (let i = 0; i <= tickCount; i++) {
    const logTick = logMin + (logMax - logMin) * (i / tickCount);
    const tickValue = Math.pow(10, logTick);
    const tickAngle = Math.PI * (1 - i / tickCount);
    const tickX = centerX + Math.cos(tickAngle) * radius * 0.7;
    const tickY = centerY + Math.sin(tickAngle) * radius * 0.7;
    
    // Format the label value
    let labelValue;
    if (tickValue >= 1) {
        labelValue = Math.round(tickValue);
    } else if (tickValue >= 0.1) {
        labelValue = tickValue.toFixed(1);
    } else {
        labelValue = tickValue.toFixed(2);
    }
    
    ctx.fillText(labelValue.toString(), tickX, tickY);
}
        
// Draw needle
const normalizedValue = Math.min(logScale(value, min, max), 1);
const needleAngle = Math.PI * (1 - normalizedValue);
        const needleLength = radius * 0.8;
        const needleX = centerX + Math.cos(needleAngle) * needleLength;
        const needleY = centerY + Math.sin(needleAngle) * needleLength;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(needleX, needleY);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        
        // Draw needle center
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
</script>

<canvas bind:this={canvas} width="300" height="200"></canvas>

<style>
    canvas {
        width: 300px;
        height: 200px;
        background: transparent;
        border-radius: 10px;
    }
</style>
