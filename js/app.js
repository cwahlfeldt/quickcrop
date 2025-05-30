// Import modules
import { ImageCropper } from './image-cropper.js';
import { FileManager } from './file-manager.js';

// Main application class
class quickcropApp {
    constructor() {
        // Initialize state
        this.state = {
            imageFiles: [],
            currentImageIndex: -1,
            outputDirectory: 'downloads://',
            loading: false
        };

        // Get DOM elements
        this.elements = {
            loadDirBtn: document.getElementById('load-dir-btn'),
            chooseOutputDirBtn: document.getElementById('choose-output-dir-btn'),
            outputDirInput: document.getElementById('output-dir'),
            imageEditor: document.getElementById('image-editor'),
            filenameEl: document.getElementById('filename'),
            dimensionsEl: document.getElementById('dimensions'),
            progressEl: document.getElementById('progress'),
            zoomInBtn: document.getElementById('zoom-in'),
            zoomOutBtn: document.getElementById('zoom-out'),
            resetViewBtn: document.getElementById('reset-view'),
            saveCropBtn: document.getElementById('save-crop'),
            skipImageBtn: document.getElementById('skip-image'),
            fileSelectionDialog: document.getElementById('file-selection-dialog'),
            fileBrowser: document.getElementById('file-browser'),
            cancelSelectionBtn: document.getElementById('cancel-selection'),
            confirmSelectionBtn: document.getElementById('confirm-selection')
        };

        // Initialize components
        this.fileManager = new FileManager(this.elements.fileBrowser);
        this.imageCropper = new ImageCropper(this.elements.imageEditor, {
            aspectRatio: 8.5 / 11 // Letter size aspect ratio
        });
        
        // Set default output directory
        this.elements.outputDirInput.value = 'Browser Downloads Folder';

        // Bind event handlers
        this.bindEvents();
    }

    bindEvents() {
        // Directory selection buttons
        this.elements.loadDirBtn.addEventListener('click', () => this.showFileDialog('input'));
        this.elements.chooseOutputDirBtn.addEventListener('click', () => this.showFileDialog('output'));
        
        // Crop control buttons
        this.elements.zoomInBtn.addEventListener('click', () => this.imageCropper.zoomIn());
        this.elements.zoomOutBtn.addEventListener('click', () => this.imageCropper.zoomOut());
        this.elements.resetViewBtn.addEventListener('click', () => this.imageCropper.resetView());
        this.elements.saveCropBtn.addEventListener('click', () => this.saveCropAndMoveNext());
        this.elements.skipImageBtn.addEventListener('click', () => this.moveToNextImage());
        
        // File dialog buttons
        this.elements.cancelSelectionBtn.addEventListener('click', () => this.hideFileDialog());
        this.elements.confirmSelectionBtn.addEventListener('click', () => this.handleSelectionConfirm());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    showFileDialog(type) {
        this.fileDialogType = type; // 'input' or 'output'
        this.elements.fileSelectionDialog.classList.remove('hidden');
        this.fileManager.showDirectorySelector(type);
    }

    hideFileDialog() {
        this.elements.fileSelectionDialog.classList.add('hidden');
    }

    async handleSelectionConfirm() {
        const selection = this.fileManager.getSelection();
        
        if (!selection) {
            alert('No selection made');
            return;
        }
        
        if (this.fileDialogType === 'input') {
            // Handle file selection for input
            if (Array.isArray(selection)) {
                await this.loadSelectedImages(selection);
            }
        } else {
            // Handle directory selection for output
            this.setOutputDirectory(selection);
        }
        
        this.hideFileDialog();
    }

    async loadSelectedImages(files) {
        try {
            this.state.loading = true;
            this.updateUI();
            
            if (files.length === 0) {
                alert('No image files were selected');
                this.state.loading = false;
                this.updateUI();
                return;
            }
            
            this.state.imageFiles = files;
            this.state.currentImageIndex = 0;
            this.state.loading = false;
            
            // Load first image
            this.loadCurrentImage();
        } catch (error) {
            console.error('Error loading images:', error);
            alert('Error loading images: ' + error.message);
            this.state.loading = false;
            this.updateUI();
        }
    }

    setOutputDirectory(directoryPath) {
        this.state.outputDirectory = directoryPath;
        
        // Update UI to show the selected output location
        if (directoryPath === 'downloads://') {
            this.elements.outputDirInput.value = 'Browser Downloads Folder';
        } else {
            this.elements.outputDirInput.value = directoryPath;
        }
    }

    async loadCurrentImage() {
        if (this.state.currentImageIndex < 0 || this.state.currentImageIndex >= this.state.imageFiles.length) {
            return;
        }
        
        const currentFile = this.state.imageFiles[this.state.currentImageIndex];
        
        try {
            await this.imageCropper.loadImage(currentFile);
            this.updateImageInfo(currentFile);
            this.updateUI();
        } catch (error) {
            console.error('Error loading image:', error);
            alert('Error loading image: ' + error.message);
            // Try to move to next image if this one fails
            this.moveToNextImage();
        }
    }

    updateImageInfo(file) {
        // Update UI with current image info
        this.elements.filenameEl.textContent = `File: ${file.name}`;
        
        const img = this.imageCropper.getImage();
        if (img) {
            this.elements.dimensionsEl.textContent = `Original: ${img.naturalWidth} × ${img.naturalHeight}px`;
        } else {
            this.elements.dimensionsEl.textContent = '-';
        }
        
        // Update progress
        const current = this.state.currentImageIndex + 1;
        const total = this.state.imageFiles.length;
        this.elements.progressEl.textContent = `${current}/${total}`;
    }

    async saveCropAndMoveNext() {
        
        if (this.state.currentImageIndex < 0 || this.state.currentImageIndex >= this.state.imageFiles.length) {
            return;
        }
        
        try {
            const currentFile = this.state.imageFiles[this.state.currentImageIndex];
            const croppedImageData = this.imageCropper.getCroppedImage();
            
            // Save the cropped image
            await this.fileManager.saveImage(
                croppedImageData,
                this.state.outputDirectory,
                currentFile.name
            );
            
            // Move to next image
            this.moveToNextImage();
        } catch (error) {
            console.error('Error saving image:', error);
            alert('Error saving image: ' + error.message);
        }
    }

    moveToNextImage() {
        if (this.state.currentImageIndex < this.state.imageFiles.length - 1) {
            this.state.currentImageIndex++;
            this.loadCurrentImage();
        } else {
            // We've reached the end of the image list
            alert('Processing complete. All images have been processed.');
            this.resetApp();
        }
    }

    resetApp() {
        this.state.imageFiles = [];
        this.state.currentImageIndex = -1;
        this.imageCropper.clear();
        this.updateUI();
    }

    updateUI() {
        // Update UI based on current state
        const hasImages = this.state.imageFiles.length > 0;
        const isProcessing = this.state.currentImageIndex >= 0 && this.state.currentImageIndex < this.state.imageFiles.length;
        
        // Update UI elements based on state
        this.elements.saveCropBtn.disabled = !isProcessing;
        this.elements.skipImageBtn.disabled = !isProcessing;
        this.elements.zoomInBtn.disabled = !isProcessing;
        this.elements.zoomOutBtn.disabled = !isProcessing;
        this.elements.resetViewBtn.disabled = !isProcessing;
        
        // Show/hide placeholder message
        const placeholderEl = this.elements.imageEditor.querySelector('.placeholder-message');
        if (placeholderEl) {
            placeholderEl.style.display = isProcessing ? 'none' : 'block';
        }
    }

    handleKeyDown(e) {
        // Only process keyboard shortcuts when we have an active image
        if (this.state.currentImageIndex < 0 || this.state.currentImageIndex >= this.state.imageFiles.length) {
            return;
        }
        
        switch (e.key) {
            case 'Enter':
                this.saveCropAndMoveNext();
                break;
            case ' ': // Space
                e.preventDefault(); // Prevent page scrolling
                this.moveToNextImage();
                break;
            case '+':
            case '=': // Both = and + on same key
                this.imageCropper.zoomIn();
                break;
            case '-':
                this.imageCropper.zoomOut();
                break;
            case 'r':
            case 'R':
                this.imageCropper.resetView();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.imageCropper.panImage(0, -10); // pan up
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.imageCropper.panImage(0, 10); // pan down
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.imageCropper.panImage(-10, 0); // pan left
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.imageCropper.panImage(10, 0); // pan right
                break;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new quickcropApp();
});
