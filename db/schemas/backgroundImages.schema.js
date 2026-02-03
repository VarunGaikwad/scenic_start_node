module.exports = {
  name: "background_images",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "image_url",
        "text_color",
        "is_welcome",
        "created_at",
        "file_hash"
      ],
      properties: {
        image_url: {
          bsonType: "string",
          description: "Public URL of the background image",
          pattern: "^https?://",
        },

        file_hash: {
          bsonType: "string",
          description: "SHA256 hash of the image file for duplicate prevention",
        },

        text_color: {
          bsonType: "string",
          description: "Text color on top of background",
          enum: ["light", "dark"],
        },

        overlay_color: {
          bsonType: "string",
          description: "Optional overlay color in hex",
          pattern: "^#([A-Fa-f0-9]{6})$",
        },

        overlay_opacity: {
          bsonType: "double",
          minimum: 0,
          maximum: 1,
          description: "Overlay opacity from 0 to 1",
        },

        is_welcome: {
          bsonType: "bool",
          description: "Whether this background is for login page",
        },

        created_at: {
          bsonType: "date",
          description: "Creation timestamp",
        },

        updated_at: {
          bsonType: "date",
          description: "Last update timestamp",
        },
      },
    },
  },
  indexes: [
    {
      key: { file_hash: 1 },
      name: "unique_file_hash",
      unique: true,
    },
  ],
};
