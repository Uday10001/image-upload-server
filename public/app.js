document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadProgress = document.getElementById('upload-progress');
    const gallery = document.getElementById('gallery');

    // Fetch initial images
    fetchImages();

    // Drag & Drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length) handleFiles(files[0]);
    });

    fileInput.addEventListener('change', function() {
        if (this.files.length) handleFiles(this.files[0]);
    });

    async function handleFiles(file) {
        if (!file.type.match('image.*')) {
            showToast('Please upload an image file (JPG/PNG)', true);
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast('File size must be less than 2MB', true);
            return;
        }

        uploadFile(file);
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('image', file);

        dropZone.classList.add('hidden');
        uploadProgress.classList.remove('hidden');

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Upload failed');

            showToast('Image uploaded successfully!');
            fetchImages(); // Refresh the gallery

        } catch (error) {
            showToast(error.message, true);
        } finally {
            dropZone.classList.remove('hidden');
            uploadProgress.classList.add('hidden');
            fileInput.value = ''; // Reset input
        }
    }

    async function fetchImages() {
        try {
            const response = await fetch('/images');
            const data = await response.json();
            
            gallery.innerHTML = ''; // Clear skeletons
            
            if (data.images.length === 0) {
                gallery.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b;">No images uploaded yet.</p>';
                return;
            }

            data.images.forEach((url, index) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.style.animationDelay = `${index * 0.1}s`;
                
                item.innerHTML = `
                    <img src="${url}" alt="Uploaded to S3" loading="lazy">
                    <div class="image-overlay">
                        <button class="copy-btn" onclick="copyToClipboard('${url}')">Copy URL</button>
                    </div>
                `;
                
                gallery.appendChild(item);
            });

        } catch (error) {
            console.error('Failed to fetch images:', error);
            gallery.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">Failed to load images.</p>';
        }
    }
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('URL copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy URL', true);
    });
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    if (isError) toast.classList.add('error');
    else toast.classList.remove('error');
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
