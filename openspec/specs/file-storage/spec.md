# File Storage

## Purpose

Defines how files are stored, protected, and organized in the archive. All files are stored privately in Supabase Storage and accessed only via time-limited signed URLs. Originals are preserved exactly, thumbnails are generated for gallery display, and storage paths are predictable by item ID.

## Requirements

### Requirement: Files are stored privately and inaccessible without authentication
The system SHALL store all files in private Supabase Storage buckets. Files SHALL never be directly accessible via public URL. Access SHALL only be granted via time-limited signed URLs generated for authenticated users.

#### Scenario: Authenticated user views a file
- **WHEN** an authenticated user requests to view an item's file
- **THEN** the system generates a signed URL valid for 1 hour and returns it to the client

#### Scenario: Signed URL expires
- **WHEN** a signed URL has passed its expiration time
- **THEN** any request using that URL SHALL receive an authorization error

#### Scenario: Unauthenticated direct file access
- **WHEN** an unauthenticated request is made directly to a storage bucket path
- **THEN** the system returns an authorization error

### Requirement: Original files are preserved exactly as uploaded
The system SHALL store original files without modification, compression, or format conversion. The original SHALL remain retrievable in its exact uploaded form.

#### Scenario: Original file retrieval
- **WHEN** a user downloads the original file for an item
- **THEN** the file returned SHALL be byte-for-byte identical to the uploaded file

### Requirement: Thumbnails are generated for gallery display
The system SHALL generate a compressed WebP thumbnail for each uploaded file where possible (photos and image-based documents). Thumbnails SHALL be stored separately from originals.

#### Scenario: Photo upload generates thumbnail
- **WHEN** a photo or image file is uploaded
- **THEN** the system generates and stores a WebP thumbnail at reduced resolution

#### Scenario: Non-image file upload
- **WHEN** a non-image file (e.g., PDF, text) is uploaded
- **THEN** the system stores the original without requiring a thumbnail; a placeholder icon is used in the gallery

### Requirement: Storage is organized by item ID
Files SHALL be stored at predictable paths using the item's UUID to prevent collisions and enable cleanup.

#### Scenario: File path structure
- **WHEN** a file is stored for an item
- **THEN** the original is stored at `originals/items/{item-id}/original.{ext}` and the thumbnail at `thumbnails/items/{item-id}/thumb.webp`