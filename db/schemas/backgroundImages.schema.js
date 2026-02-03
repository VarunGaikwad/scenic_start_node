module.exports = {
  name: "background_images",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "image_url",
        "text_color",
        "is_active",
        "is_welcome",
        "created_at",
      ],
      properties: {
        image_url: {
          bsonType: "string",
          description: "Public URL of the background image",
          pattern: "^https?://",
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

        is_active: {
          bsonType: "bool",
          description: "Whether this background is currently usable",
        },

        is_welcome: {
          bsonType: "bool",
          description: "Whether this background is for login page",
        },

        priority: {
          bsonType: "int",
          minimum: 0,
          description: "Lower number = higher priority",
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
};
