"""Add NFC ID extra field.

Revision ID: a1b2c3d4e5f6
Revises: 415a8f855e14
Create Date: 2026-01-03 12:00:00.000000
"""

import json
from datetime import datetime

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "415a8f855e14"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    # Add the nfc_id extra field to the extra_fields_spool setting
    # This migration ensures existing installations get the predefined nfc_id field
    connection = op.get_bind()
    
    # Check if the setting already exists
    result = connection.execute(
        sa.text("SELECT value FROM setting WHERE key = 'extra_fields_spool'")
    ).fetchone()
    
    if result:
        # Setting exists, merge nfc_id if not already present
        existing_fields = json.loads(result[0])
        
        # Check if nfc_id already exists
        if not any(field.get("key") == "nfc_id" for field in existing_fields):
            # Add nfc_id field at the beginning
            nfc_field = {
                "key": "nfc_id",
                "entity_type": "spool",
                "name": "NFC Tag ID",
                "order": 0,
                "unit": None,
                "field_type": "text",
                "default_value": None,
                "choices": None,
                "multi_choice": None,
            }
            existing_fields.insert(0, nfc_field)
            
            # Update the setting
            connection.execute(
                sa.text("UPDATE setting SET value = :value, last_updated = :updated WHERE key = 'extra_fields_spool'"),
                {"value": json.dumps(existing_fields), "updated": datetime.utcnow()}
            )
    else:
        # Setting doesn't exist, create it with nfc_id field
        nfc_field = {
            "key": "nfc_id",
            "entity_type": "spool",
            "name": "NFC Tag ID",
            "order": 0,
            "unit": None,
            "field_type": "text",
            "default_value": None,
            "choices": None,
            "multi_choice": None,
        }
        connection.execute(
            sa.text("INSERT INTO setting (key, value, last_updated) VALUES (:key, :value, :updated)"),
            {"key": "extra_fields_spool", "value": json.dumps([nfc_field]), "updated": datetime.utcnow()}
        )


def downgrade() -> None:
    """Perform the downgrade."""
    # Remove the nfc_id extra field from the extra_fields_spool setting
    connection = op.get_bind()
    
    result = connection.execute(
        sa.text("SELECT value FROM setting WHERE key = 'extra_fields_spool'")
    ).fetchone()
    
    if result:
        existing_fields = json.loads(result[0])
        
        # Remove nfc_id field
        existing_fields = [field for field in existing_fields if field.get("key") != "nfc_id"]
        
        # Update the setting
        connection.execute(
            sa.text("UPDATE setting SET value = :value, last_updated = :updated WHERE key = 'extra_fields_spool'"),
            {"value": json.dumps(existing_fields), "updated": datetime.utcnow()}
        )
