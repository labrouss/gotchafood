TIMEDATE=`date +"%d%h%Y-%H%M"`
VERSION=`date +"v.%y.%j.%H%M"`
echo "Creating backup file to : ~labrouss/gotchafood.v${VERSION}.tar.gz" 
tar cvfz ~labrouss/gotchafood.${VERSION}.tar.gz --exclude="node_modules" --exclude="backup-*" ./*
echo "--------------------------------------------------------------------------------------------------"
if [ -f ~labrouss/gotchafood.${VERSION}.tar.gz ] ; then
	echo "OK ! File backup file created succesfully"
        ls -ltr ~labrouss/gotchafood.${VERSION}.tar.gz 
else
	echo "FAILED TO BACKUP"

fi


