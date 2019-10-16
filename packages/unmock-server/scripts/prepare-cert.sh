string=$1

if [ -z ${string} ];
then
  echo "Add domain names like this: bash prepare-cert.sh domain.io,domain.io2"
  exit 1
fi

arr=(${string//,/ })

SAN=""

first=true

for i in "${arr[@]}"
do
  if [ ${first} = false ];
  then
    SAN+=,
  fi
  first=false
  SAN+=DNS:$i
  echo $SAN
done

openssl req -x509 -newkey rsa:4096 -subj "/C=FI/ST=HE/O=Meeshkan/CN=*" -reqexts SAN -extensions SAN -config <(cat /etc/ssl/openssl.cnf <(printf "[SAN]\nsubjectAltName=${SAN}")) -nodes -keyout key.pem -out cert.pem

echo $(openssl x509 -in cert.pem -text -noout)
