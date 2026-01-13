let selectedFile = null;
let convertedImages = [];
let originalFileName = '';

const imageInput = document.getElementById('imageInput');
const fileName = document.getElementById('fileName');
const dropZone = document.getElementById('dropZone');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const imageType = document.getElementById('imageType');
const imageSize = document.getElementById('imageSize');
const outputFormat = document.getElementById('outputFormat');
const convertBtn = document.getElementById('convertBtn');
const loadingSection = document.getElementById('loadingSection');
const downloadSection = document.getElementById('downloadSection');
const downloadBtn = document.getElementById('downloadBtn');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// Set current year for copyright
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Process file function
function processFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        errorSection.classList.remove('hidden');
        errorMessage.textContent = 'Please select a valid image file';
        return;
    }
    
    selectedFile = file;
    originalFileName = file.name.split('.').slice(0, -1).join('.') || 'image';
    fileName.textContent = file.name;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    
    // Auto-detect and display file info
    const fileType = file.type.split('/')[1] || 'unknown';
    imageType.textContent = fileType.toUpperCase();
    imageSize.textContent = formatFileSize(file.size);
    
    // Enable convert button
    convertBtn.disabled = false;
    
    // Hide previous results
    downloadSection.classList.add('hidden');
    errorSection.classList.add('hidden');
}

// File input change handler
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
});

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('border-blue-500', 'bg-blue-50', 'scale-[1.02]');
    dropZone.classList.remove('border-purple-400');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'scale-[1.02]');
    dropZone.classList.add('border-purple-400');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'scale-[1.02]');
    dropZone.classList.add('border-purple-400');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
});

// Convert button handler
convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    // Get selected formats
    const selectedFormats = Array.from(document.querySelectorAll('input[name="format"]:checked'))
        .map(cb => cb.value);
    
    if (selectedFormats.length === 0) {
        errorSection.classList.remove('hidden');
        errorMessage.textContent = 'Please select at least one output format';
        return;
    }
    
    // Hide previous results
    downloadSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    
    // Show loading
    loadingSection.classList.remove('hidden');
    convertBtn.disabled = true;
    
    try {
        const startTime = Date.now();
        convertedImages = [];
        
        // Convert to all selected formats
        for (const format of selectedFormats) {
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('outputFormat', format);
            
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Conversion to ${format.toUpperCase()} failed`);
            }
            
            const blob = await response.blob();
            convertedImages.push({ format, blob });
        }
        
        // Ensure minimum 5 second conversion time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 5000 - elapsedTime);
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        
        // Hide loading
        loadingSection.classList.add('hidden');
        
        // Show download section with multiple buttons
        displayDownloadButtons();
        downloadSection.classList.remove('hidden');
        convertBtn.disabled = false;
        
    } catch (error) {
        console.error('Error:', error);
        loadingSection.classList.add('hidden');
        errorSection.classList.remove('hidden');
        errorMessage.textContent = error.message || 'An error occurred during conversion';
        convertBtn.disabled = false;
    }
});

// Display download buttons for all converted images
function displayDownloadButtons() {
    const downloadButtons = document.getElementById('downloadButtons');
    const conversionCount = document.getElementById('conversionCount');
    
    downloadButtons.innerHTML = '';
    conversionCount.textContent = `${convertedImages.length} format${convertedImages.length > 1 ? 's' : ''} converted`;
    
    convertedImages.forEach(({ format, blob }) => {
        const btn = document.createElement('button');
        btn.className = 'px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200';
        btn.innerHTML = `📥 Download ${format.toUpperCase()}`;
        btn.onclick = () => downloadImage(blob, format);
        downloadButtons.appendChild(btn);
    });
    
    // Add download all button if multiple formats
    if (convertedImages.length > 1) {
        const downloadAllBtn = document.createElement('button');
        downloadAllBtn.className = 'px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mt-2';
        downloadAllBtn.innerHTML = '📥 Download All';
        downloadAllBtn.onclick = downloadAll;
        downloadButtons.appendChild(downloadAllBtn);
    }
}

// Download single image
function downloadImage(blob, format) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${originalFileName}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download all images
function downloadAll() {
    convertedImages.forEach(({ format, blob }) => {
        setTimeout(() => downloadImage(blob, format), 100);
    });
}

// Format file size helper
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
