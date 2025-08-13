# Personal Prayer Lists - Database Schema

## Firestore Collections Structure

### 1. Prayer Lists Collection: `prayerLists`
```javascript
{
  id: "auto-generated-id",
  userId: "user-uid",
  name: "Family Prayers",
  description: "Prayers for my family members",
  color: "#4CAF50", // Green
  icon: "fas fa-family", // Font Awesome icon class
  isDefault: false, // true for "General" default list
  orderIndex: 0, // for custom ordering
  createdAt: Timestamp,
  updatedAt: Timestamp,
  prayerCount: 0 // denormalized count for quick display
}
```

### 2. Prayer List Items Collection: `prayerListItems`
```javascript
{
  id: "auto-generated-id",
  prayerListId: "prayer-list-id",
  prayerId: "prayer-id", // reference to existing prayers collection
  orderIndex: 0, // for drag-and-drop ordering within list
  addedAt: Timestamp,
  addedBy: "user-uid" // who added this prayer to the list
}
```

### 3. Updated Prayers Collection (existing)
Add new fields to existing prayers:
```javascript
{
  // ... existing fields
  personalLists: ["list-id-1", "list-id-2"], // array of list IDs this prayer belongs to
  isPersonal: true, // distinguish personal vs community prayers
  // ... rest of existing fields
}
```

## Default Prayer Lists

Every user gets these default lists on signup:
1. **General** - Default list for uncategorized prayers
2. **Family** - Family-related prayer requests
3. **Health** - Health and healing prayers
4. **Work/Career** - Professional life prayers
5. **Spiritual Growth** - Personal spiritual development

## Security Rules (Firestore)

```javascript
// Prayer Lists - only user can access their own lists
match /prayerLists/{listId} {
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
}

// Prayer List Items - only user can access their own list items
match /prayerListItems/{itemId} {
  allow read, write: if request.auth != null && 
    exists(/databases/$(database)/documents/prayerLists/$(resource.data.prayerListId)) &&
    get(/databases/$(database)/documents/prayerLists/$(resource.data.prayerListId)).data.userId == request.auth.uid;
}
```

## Implementation Strategy

### Phase 1: Basic Lists
- Create/Read/Update/Delete prayer lists
- Assign prayers to lists during creation
- View prayers filtered by list

### Phase 2: Organization
- Drag-and-drop reordering
- Move prayers between lists
- Bulk actions (move multiple prayers)

### Phase 3: Enhancement
- Custom icons and colors
- List sharing (premium feature)
- Advanced filtering and search within lists