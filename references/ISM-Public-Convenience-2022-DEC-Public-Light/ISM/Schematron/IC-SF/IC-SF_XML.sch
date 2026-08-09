<?xml version="1.0" encoding="UTF-8"?>
<!--UNCLASSIFIED--><?ICEA master?>
<!-- Notices - Distribution Notice: 
           This document has been approved for Public Release and is available for use without restriction.
       -->
<!-- WARNING: 
    Once compiled into an XSLT the result will 
    be the aggregate classification of all the CVES 
    and included .sch files
-->
<sch:schema xmlns:sch="http://purl.oclc.org/dsdl/schematron"
            xmlns:ism="urn:us:gov:ic:ism"
            xmlns:iscf="urn:us:gov:ic:sf"
            xmlns:sfhashv="urn:us:gov:ic:sf:hashverification"
            queryBinding="xslt2">
    <sch:ns uri="urn:us:gov:ic:ism" prefix="ism"/>
    <sch:ns uri="urn:us:gov:ic:sf" prefix="sf"/>
    <sch:ns uri="urn:us:gov:ic:sf:hashverification" prefix="sfhashv"/>

   <!--****************************-->
<!-- (U) IC-SF Phases -->
<!--****************************-->
<!--****************************-->
<!-- (U) IC-SF ID Rules -->
<!--****************************-->

<!--(U) -->
   <sch:include href="./Rules/IC-SF_ID_00001.sch"/>
   <sch:include href="./Rules/IC-SF_ID_00002.sch"/>

   <!--****************************-->
<!-- (U) IC-SF Phases -->
<!--****************************--></sch:schema>
<!--UNCLASSIFIED-->
