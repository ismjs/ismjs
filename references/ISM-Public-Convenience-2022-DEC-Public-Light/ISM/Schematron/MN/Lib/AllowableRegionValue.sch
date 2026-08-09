<?xml version="1.0" encoding="UTF-8"?>
<sch:pattern xmlns:sch="http://purl.oclc.org/dsdl/schematron" xmlns:ism="urn:us:gov:ic:ism"
             abstract="true"
             id="AllowableRegionValues">  
  <sch:p class="codeDesc" ism:classification="U" ism:ownerProducer="USA">
    This abstract pattern checks to see if a value exists in the Region Acronym List. The following 
    parameters are used by this pattern:
    
    $context     := the context in which the searchValue exists.
    $searchTerm  := the value which you want to verify is in the list.
    $errMsg      := the error message text to display when the assertion fails.
  </sch:p>
  <sch:rule context="$context">
      <sch:let name="Region"
               value="document('../../CVE/MN/CVEnumMNRegion.xml')//cve:CVE/cve:Enumeration/cve:Term/cve:Value"/>
      <sch:assert test="some $token in $Region satisfies $token = $searchTerm or matches($searchTerm, concat('^',$token,'$'))"
                  flag="error">
         <sch:value-of select="$errMsg"/>
      </sch:assert>
  </sch:rule>
</sch:pattern>
