# LetterCrop

LetterCrop is a web application that allows users to quickly crop images to a letter size (8.5" x 11") aspect ratio. The app provides an intuitive interface for loading, viewing, and cropping images with support for zooming, panning, and keyboard shortcuts.

## Features

- Load images from a directory
- Display images one at a time with navigation controls
- Zoom and pan images to position them perfectly within the crop area
- Fixed 8.5:11 (letter size) aspect ratio cropping
- Keyboard shortcuts for common operations
- Save cropped images to a specified output directory
- Automatically advance to the next image after saving

## Getting Started

### Prerequisites

- Node.js (version 12 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/lettercrop.git
   cd lettercrop
   ```

2. Start the server:
   ```
   node server.js
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Click "Load Images Directory" to select images from your computer
2. Use the mouse to drag the image into position within the crop frame
3. Use the zoom controls or mouse wheel to adjust the zoom level
4. Press "Save Crop" or hit Enter to save the current crop and move to the next image
5. Cropped images will be downloaded to your browser's download folder with a "cropped_" prefix
6. Continue until all images are processed

### Keyboard Shortcuts

- **Arrow keys**: Pan the image
- **+/-**: Zoom in/out
- **Enter**: Save the current crop and move to the next image
- **Space**: Skip the current image
- **R**: Reset the view

## Implementation Notes

This implementation is a client-side web application that uses modern JavaScript features. It includes:

- Modern ES6+ JavaScript with modular architecture
- Canvas-based image cropping for high-quality results
- Responsive design that works on desktop and tablet devices
- Efficient image handling to minimize memory usage

### Technical Details

The application consists of three main modules:

1. **App.js**: The main application controller that handles the UI and orchestrates the workflow.
2. **ImageCropper.js**: A module for displaying, zooming, panning, and cropping images with a fixed aspect ratio.
3. **FileManager.js**: A module for handling file system interactions (directory browsing, loading and saving files).

## Browser Compatibility

LetterCrop works best in modern browsers:
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Limitations

- Due to browser security restrictions, the application can't directly access your file system without your explicit permission
- The app uses the browser's download mechanism to save cropped images - they'll be saved to your default downloads location
- The cropped images are saved as JPG files with a "cropped_" prefix
- Large images may cause performance issues on devices with limited memory

## Future Improvements

- Add batch processing capabilities
- Support for custom aspect ratios
- Image rotation and basic adjustments
- Configurable output file format and quality
- Dark mode support
- Progressive Web App (PWA) capabilities for offline use

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the need for a simple, focused tool for cropping images to standard paper sizes
- Built with vanilla JavaScript for maximum compatibility and performance
