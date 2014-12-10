#!/bin/bash


source config.sh

# launch a docker container running the app server.

docker run -it --rm  \
    -e "DW_DB=$DW_DB" \
    -e "DW_DB_USER=$DW_DB_USER" \
    -e "DW_DB_PASSWORD=$DW_DB_PASSWORD" \
    -e "DW_DB_HOST=$DW_DB_HOST" \
    -e "DW_DB_PORT=$DW_DB_PORT" \
    -e "DW_KAFKA_CONN_POOL=$DW_KAFKA_CONN_POOL" \
    -e "DW_KAFKA_PUB_TOPIC=$DW_KAFKA_PUB_TOPIC" \
    -e "DW_CONN_TYPE=$DW_CONN_TYPE" \
    -e "DW_MOCK_AUTH=$DW_MOCK_AUTH" \
    -e "DW_GOOGLE_CLIENT_IDS=$DW_GOOGLE_CLIENT_IDS" \
    -e "DW_IMPALA_HOSTS=$DW_IMPALA_HOSTS" \
    -e "DW_IMPALA_PORT=$DW_IMPALA_PORT" \
    -e "DW_IMPALA_DB=$DW_IMPALA_DB" \
    -e "DW_HBASE_HOST=$DW_HBASE_HOST" \
    -e "DW_HBASE_DOMAIN_ENTITIES_TABLE=$DW_HBASE_DOMAIN_ENTITIES_TABLE" \
    -e "DW_HBASE_EXTRACTED_ALL_TABLE=$DW_HBASE_EXTRACTED_ALL_TABLE" \
    -e "DW_HBASE_EXTRACTED_DOMAIN_TABLE=$DW_HBASE_EXTRACTED_DOMAIN_TABLE" \
    -e "DW_EXTERNAL_LINK_NAMES=$DW_EXTERNAL_LINK_NAMES" \
    -e "DW_EXTERNAL_LINK_VALUES=$DW_EXTERNAL_LINK_VALUES" \
    $IMAGE /bin/bash
