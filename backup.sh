#!/bin/bash

DB_HOST="simi-erp-db.cvtketctxigv.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_USER="admin_simi"
DB_NAME="simi_erp_db"
S3_BUCKET="s3://simi-erp-backups-temuco2026"

FECHA=$(date +%Y-%m-%d_%H-%M-%S)
ARCHIVO="backup_simi_$FECHA.sql"

echo "Iniciando respaldo de la BD PostgreSQL (RDS)..."
PGPASSWORD="SimiAdmin_2026#DB" pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F c -f /tmp/$ARCHIVO

echo "Subiendo respaldo al Bucket S3..."
aws s3 cp /tmp/$ARCHIVO $S3_BUCKET/$ARCHIVO --acl private

echo "¡Respaldo completado y subido a S3 con éxito!"
