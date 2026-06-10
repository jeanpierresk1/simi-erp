#!/bin/bash

# Configuración de variables (El "Encargado Nube" debe poner los datos reales de AWS RDS)
DB_HOST="tu-instancia-rds.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_USER="admin_simi"
DB_NAME="simi_erp_db"
S3_BUCKET="s3://bucket-respaldos-simi-2026"

# Generar fecha actual para el nombre del archivo
FECHA=$(date +%Y-%m-%d_%H-%M-%S)
ARCHIVO="backup_simi_$FECHA.sql"

echo "Iniciando respaldo de la BD PostgreSQL (RDS)..."
# Comando para exportar la base de datos (requiere la contraseña en la variable de entorno PGPASSWORD)
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F c -f /tmp/$ARCHIVO

echo "Subiendo respaldo al Bucket S3..."
# Comando de AWS CLI para subir el archivo con ACL restrictivas
aws s3 cp /tmp/$ARCHIVO $S3_BUCKET/$ARCHIVO --acl private

echo "¡Respaldo completado y subido a S3 con éxito!"

# Nota para el informe: Este script se debe ejecutar mediante un CronJob en Linux:
# 0 2 * * * /ruta/al/script/backup.sh (Se ejecuta todos los días a las 2:00 AM)