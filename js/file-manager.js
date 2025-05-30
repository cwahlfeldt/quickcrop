/**
 * File Manager Module
 * Handles loading, listing, and saving files
 */
export class FileManager {
    /**
     * Create a new FileManager
     * @param {HTMLElement} browserElement - DOM element for displaying file browser
     */
    constructor(browserElement) {
        this.browserElement = browserElement;
        this.selectedPath = '';
        this.selectedFiles = null;
        this.supportedImageTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/bmp',
            'image/webp',
            'image/tiff'
        ];
    }
    
    /**
     * Show a file selection interface for choosing directories
     * @param {string} purpose - 'input' for selecting image directory, 'output' for selecting save location
     */
    async showDirectorySelector(purpose) {
        try {
            // Clear browser element
            this.browserElement.innerHTML = '';
            
            // Create instruction header
            const header = document.createElement('div');
            header.className = 'file-selector-header';
            
            if (purpose === 'input') {
                header.innerHTML = `
                    <h3>Select Images</h3>
                    <p>Click the button below to select images from your computer.</p>
                `;
                
                // Create file input for selecting multiple images
                const fileSelector = document.createElement('div');
                fileSelector.className = 'file-selector';
                
                const selectButton = document.createElement('button');
                selectButton.className = 'btn primary';
                selectButton.textContent = 'Select Images';
                selectButton.addEventListener('click', () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'image/*';
                    
                    input.onchange = (e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            const files = Array.from(e.target.files);
                            this.displaySelectedFiles(files);
                            this.selectedFiles = files;
                        }
                    };
                    
                    input.click();
                });
                
                fileSelector.appendChild(selectButton);
                
                // Create container for selected files preview
                const previewContainer = document.createElement('div');
                previewContainer.id = 'selected-files-preview';
                previewContainer.className = 'selected-files-preview';
                
                fileSelector.appendChild(previewContainer);
                this.browserElement.appendChild(header);
                this.browserElement.appendChild(fileSelector);
            } else {
                header.innerHTML = `
                    <h3>Save Location</h3>
                    <p>Cropped images will be downloaded to your downloads folder with a "cropped_" prefix.</p>
                    <p>Due to browser security restrictions, we cannot directly save to a specific folder.</p>
                `;
                
                const saveInfo = document.createElement('div');
                saveInfo.className = 'save-info';
                saveInfo.innerHTML = `
                    <button id="set-download-dir" class="btn primary">Use Downloads Folder</button>
                `;
                
                saveInfo.querySelector('#set-download-dir').addEventListener('click', () => {
                    this.selectedPath = 'downloads://';
                });
                
                this.browserElement.appendChild(header);
                this.browserElement.appendChild(saveInfo);
            }
        } catch (error) {
            console.error('Error showing directory selector:', error);
            this.showError('Failed to initialize file selector: ' + error.message);
        }
    }
    
    /**
     * Display selected files in the preview container
     * @param {Array<File>} files - Selected files
     */
    displaySelectedFiles(files) {
        const previewContainer = document.getElementById('selected-files-preview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = '';
        
        const header = document.createElement('h4');
        header.textContent = `Selected ${files.length} image${files.length !== 1 ? 's' : ''}`;
        previewContainer.appendChild(header);
        
        const fileList = document.createElement('div');
        fileList.className = 'file-list';
        
        // Show first 5 files with thumbnails if possible
        const displayLimit = Math.min(files.length, 5);
        for (let i = 0; i < displayLimit; i++) {
            const file = files[i];
            const item = document.createElement('div');
            item.className = 'file-item';
            
            // Create thumbnail if it's an image
            if (file.type.startsWith('image/')) {
                const thumbnail = document.createElement('div');
                thumbnail.className = 'thumbnail';
                
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.onload = () => URL.revokeObjectURL(img.src);
                thumbnail.appendChild(img);
                
                item.appendChild(thumbnail);
            } else {
                const icon = document.createElement('div');
                icon.className = 'file-icon';
                icon.textContent = '📄';
                item.appendChild(icon);
            }
            
            const name = document.createElement('span');
            name.className = 'file-name';
            name.textContent = file.name;
            
            item.appendChild(name);
            fileList.appendChild(item);
        }
        
        // If there are more files, show a count
        if (files.length > displayLimit) {
            const moreFiles = document.createElement('div');
            moreFiles.className = 'more-files';
            moreFiles.textContent = `+ ${files.length - displayLimit} more`;
            fileList.appendChild(moreFiles);
        }
        
        previewContainer.appendChild(fileList);
    }
    
    /**
     * Show error message in browser
     * @param {string} message - Error message
     */
    showError(message) {
        this.browserElement.innerHTML = `<div class="error">${message}</div>`;
    }
    
    /**
     * Get selected files or path
     * @returns {Array<File>|string} - Selected files for input or path for output
     */
    getSelection() {
        return this.selectedFiles || this.selectedPath;
    }
    
    /**
     * Get image files selected by the user
     * @returns {Promise<Array<File>>} - Array of image files
     */
    async getSelectedImages() {
        if (this.selectedFiles && this.selectedFiles.length > 0) {
            // Filter only image files
            const imageFiles = this.selectedFiles.filter(file => 
                this.supportedImageTypes.includes(file.type)
            );
            
            // Log for debugging
            console.log(`Selected ${imageFiles.length} valid image files for processing`);
            
            return imageFiles;
        }
        
        return [];
    }
    
    /**
     * Save an image
     * @param {string} imageData - Base64 encoded image data
     * @param {string} directoryPath - Output directory path (unused in browser context)
     * @param {string} filename - Original filename
     * @returns {Promise<void>} - Resolves when saved
     */
    async saveImage(imageData, directoryPath, filename) {
        try {
            // Create a filename with 'cropped_' prefix
            const name = filename.split('.')[0] || 'image';
            const newFilename = `cropped_${name}.jpg`;
            
            // Create a link element to trigger download
            const link = document.createElement('a');
            link.href = imageData;
            link.download = newFilename;
            
            // Append to document, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(new Error('Failed to save image: ' + error.message));
        }
    }
}
