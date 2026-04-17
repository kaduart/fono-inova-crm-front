#!/bin/bash

FRONT_DIR="front/src"
OUT_FILE="api-endpoints-report.txt"

echo "🔎 Varredura de APIs no frontend" > $OUT_FILE
echo "==============================" >> $OUT_FILE
echo "" >> $OUT_FILE

echo "📌 V1 endpoints encontrados:" >> $OUT_FILE
grep -Rho "/api/[^\"') ]*" $FRONT_DIR | sort | uniq -c | sort -nr >> $OUT_FILE

echo "" >> $OUT_FILE
echo "📌 Apenas patients:" >> $OUT_FILE
grep -R "/api/patients" -n $FRONT_DIR >> $OUT_FILE

echo "" >> $OUT_FILE
echo "📌 Payments:" >> $OUT_FILE
grep -R "/api/payments" -n $FRONT_DIR >> $OUT_FILE

echo "" >> $OUT_FILE
echo "📌 Packages:" >> $OUT_FILE
grep -R "/api/packages" -n $FRONT_DIR >> $OUT_FILE

echo ""
echo "✅ Relatório gerado em $OUT_FILE"