# Upload

## Purpose

Provides the interface and processing pipeline for getting files into the archive. Supports drag-and-drop and file picker, requires minimal input, generates thumbnails automatically, shows per-file progress, and handles batch uploads with independent failure handling.

## Requirements

### Requirement: Users can upload files via drag-and-drop or file picker
The system SHALL provide an upload interface supporting both drag-and-drop onto a drop zone and a traditional file picker. Both methods SHALL support single and multiple file selection.

#### Scenario: Single file drag-and-drop
- **WHEN** a user drags a single file onto the upload drop zone
- **THEN** the system initiates upload for that file

#### Scenario: Multiple files selected via file picker
- **WHEN** a user selects multiple files via the file picker
- **THEN** the system initiates upload for all selected files

### Requirement: Upload requires minimal input before saving
The system SHALL not require any metadata beyond the file itself to complete an upload. If no title is provided, the system SHALL derive a title from the filename. All other fields are optional.

#### Scenario: Upload with no title provided
- **WHEN** a user uploads a file without entering a title
- **THEN** the system creates the item with the filename (without extension) as the title

#### Scenario: Upload with title provided
- **WHEN** a user uploads a file and enters a custom title
- **THEN** the system creates the item with that title

### Requirement: Thumbnails are generated automatically on upload
The system SHALL generate a thumbnail for each uploaded image file as part of the upload process. The thumbnail SHALL be stored and available before the user navigates away from the upload screen.

#### Scenario: Thumbnail available after upload
- **WHEN** a user completes uploading a photo
- **THEN** the item's thumbnail is available in the gallery immediately

### Requirement: Upload progress is visible to the user
The system SHALL display upload progress for each file being uploaded, including a progress indicator and success or error state on completion.

#### Scenario: Upload in progress
- **WHEN** a file is being uploaded
- **THEN** the system displays a progress indicator for that file

#### Scenario: Upload succeeds
- **WHEN** a file upload completes successfully
- **THEN** the system displays a success state and provides a link to the new item

#### Scenario: Upload fails
- **WHEN** a file upload fails due to a network or server error
- **THEN** the system displays an error message and offers a retry option

### Requirement: Batch uploads are supported
The system SHALL allow uploading multiple files in a single session. Each file in a batch SHALL be processed independently so a single failure does not block other uploads.

#### Scenario: Batch upload with one failure
- **WHEN** a user uploads five files and one fails
- **THEN** the four successful files are saved as items and the failed file shows an error with a retry option