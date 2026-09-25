import { guidance } from './guidance.js';

// English keys are stable UI copy, not API values. Names and resident-written text stay unchanged.
const labels = `
Change language¦भाषा बदलें¦ભાષા બદલો
Account history¦खाता इतिहास¦ખાતાનો ઇતિહાસ
Billing¦बिलिंग¦બિલિંગ
Resident assignment¦निवासी आवंटन¦રહેવાસી ફાળવણી
Account entries¦खाते की प्रविष्टियाँ¦ખાતાની નોંધો
Resident assignments¦निवासियों का आवंटन¦રહેવાસીઓની ફાળવણી
Balance at start¦शुरुआती शेष¦શરૂઆતની બાકી રકમ
Balance at end¦अंतिम शेष¦અંતિમ બાકી રકમ
Bills issued¦जारी बिल¦જારી થયેલાં બિલ
Late fees¦विलंब शुल्क¦વિલંબ ચાર્જ
Extra charges minus credits¦अतिरिक्त शुल्क घटा जमा समायोजन¦વધારાના ચાર્જમાંથી જમા સમાયોજન બાદ
Bill issued¦बिल जारी हुआ¦બિલ જારી થયું
Payment received¦भुगतान प्राप्त हुआ¦ચુકવણી મળી
Extra charge added¦अतिरिक्त शुल्क जोड़ा गया¦વધારાનો ચાર્જ ઉમેરાયો
Amount credited¦समायोजित राशि¦સમાયોજિત રકમ
Amount paid¦भुगतान राशि¦ચૂકવેલી રકમ
Extra charges¦अतिरिक्त शुल्क¦વધારાના ચાર્જ
Reason / description¦कारण / विवरण¦કારણ / વર્ણન
Entry type¦प्रविष्टि प्रकार¦નોંધનો પ્રકાર
Payer¦भुगतानकर्ता¦ચૂકવનાર
Assignment started¦आवंटन शुरू हुआ¦ફાળવણી શરૂ થઈ
Assignment ended¦आवंटन समाप्त हुआ¦ફાળવણી પૂરી થઈ
Payment method¦भुगतान का तरीका¦ચુકવણીની પદ્ધતિ
Notes¦टिप्पणियाँ¦નોંધો
Awaiting review¦समीक्षा की प्रतीक्षा¦સમીક્ષાની રાહમાં
Payment confirmed¦भुगतान की पुष्टि हुई¦ચુકવણીની પુષ્ટિ થઈ
Needs attention¦ध्यान देना आवश्यक¦ધ્યાન આપવું જરૂરી
Not approved¦स्वीकृत नहीं¦મંજૂર નથી
Unknown¦अज्ञात¦અજ્ઞાત
Add residents¦निवासी जोड़ें¦રહેવાસીઓ ઉમેરો
Create bill¦बिल बनाएँ¦બિલ બનાવો
Export dues¦बकाया निर्यात करें¦બાકી રકમ નિકાસ કરો
Inbox¦इनबॉक्स¦ઇનબૉક્સ
Refreshing¦ताज़ा हो रहा है¦તાજું થઈ રહ્યું છે
Police Station¦पुलिस स्टेशन¦પોલીસ સ્ટેશન
Fire Brigade¦अग्निशमन सेवा¦અગ્નિશમન સેવા
Ambulance¦एम्बुलेंस¦ઍમ્બ્યુલન્સ
Society Office¦सोसाइटी कार्यालय¦સોસાયટી કાર્યાલય
Electrician¦इलेक्ट्रीशियन¦ઇલેક્ટ્રિશિયન
Plumber (Raju)¦प्लंबर (राजू)¦પ્લમ્બર (રાજુ)
Request sent¦अनुरोध भेजा गया¦વિનંતી મોકલાઈ
Booking details received¦बुकिंग विवरण मिला¦બુકિંગની વિગતો મળી
Committee review¦समिति की समीक्षा¦સમિતિની સમીક્ષા
Awaiting decision¦निर्णय की प्रतीक्षा¦નિર્ણયની રાહમાં
Availability approved¦उपलब्धता स्वीकृत¦ઉપલબ્ધતા મંજૂર
Event & inspection¦कार्यक्रम और जाँच¦કાર્યક્રમ અને તપાસ
Committee records cleaning or damage¦समिति सफ़ाई या नुकसान दर्ज करती है¦સમિતિ સફાઈ કે નુકસાન નોંધે છે
Settlement complete¦निपटान पूरा हुआ¦પતાવટ પૂર્ણ થઈ
Pending final settlement¦अंतिम निपटान बाकी¦અંતિમ પતાવટ બાકી
Rejected by committee¦समिति द्वारा अस्वीकृत¦સમિતિ દ્વારા નામંજૂર
Payment update¦भुगतान अपडेट¦ચુકવણી અપડેટ
Help request update¦सहायता अनुरोध अपडेट¦મદદ વિનંતી અપડેટ
Payment reminder¦भुगतान रिमाइंडर¦ચુકવણી રિમાઇન્ડર
Overdue bill¦समय-सीमा पार बिल¦મુદત વીતી ગયેલું બિલ
Bill updated¦बिल अपडेट हुआ¦બિલ અપડેટ થયું
Society events must be free. The server pricing needs updating; your booking has not been submitted.¦सोसाइटी के कार्यक्रम निःशुल्क होने चाहिए। सर्वर की कीमतें अपडेट करनी होंगी; आपकी बुकिंग नहीं भेजी गई है।¦સોસાયટીના કાર્યક્રમો મફત હોવા જોઈએ. સર્વરના ભાવ અપડેટ કરવા પડશે; તમારી બુકિંગ મોકલાઈ નથી.
What would you like to do?¦आप क्या करना चाहेंगे?¦તમે શું કરવા માંગો છો?
Valsad, Gujarat, India¦वलसाड, गुजरात, भारत¦વલસાડ, ગુજરાત, ભારત
Choose your language¦अपनी भाषा चुनें¦તમારી ભાષા પસંદ કરો
Saved on this device¦इस डिवाइस पर सहेजा जाता है¦આ ઉપકરણ પર સાચવવામાં આવે છે
Language changed¦भाषा बदल गई¦ભાષા બદલાઈ ગઈ
Home¦होम¦હોમ
Dashboard¦डैशबोर्ड¦ડેશબોર્ડ
Menu¦मेन्यू¦મેનૂ
Bills¦बिल¦બિલ
My Bills¦मेरे बिल¦મારા બિલ
Notices¦सूचनाएँ¦સૂચનાઓ
Notice Board¦सूचना पटल¦સૂચના બોર્ડ
Help¦सहायता¦મદદ
Helpdesk¦सहायता केंद्र¦મદદ કેન્દ્ર
Directory¦संपर्क सूची¦સંપર્ક સૂચિ
Community Directory¦सोसाइटी संपर्क सूची¦સોસાયટી સંપર્ક સૂચિ
Expenses¦खर्च¦ખર્ચ
Society Expenses¦सोसाइटी के खर्च¦સોસાયટીના ખર્ચ
Accounts¦खाते¦ખાતાં
Notifications¦सूचनाएँ¦સૂચનાઓ
Profile¦प्रोफ़ाइल¦પ્રોફાઇલ
My Profile¦मेरी प्रोफ़ाइल¦મારી પ્રોફાઇલ
Settings¦सेटिंग्स¦સેટિંગ્સ
Account Settings¦खाता सेटिंग्स¦ખાતા સેટિંગ્સ
Your account¦आपका खाता¦તમારું ખાતું
Event Management¦कार्यक्रम प्रबंधन¦કાર્યક્રમ વ્યવસ્થાપન
Event¦कार्यक्रम¦કાર્યક્રમ
Events¦कार्यक्रम¦કાર્યક્રમો
Event booking¦कार्यक्रम बुकिंग¦કાર્યક્રમ બુકિંગ
Event bookings¦कार्यक्रम बुकिंग¦કાર્યક્રમ બુકિંગ
Booking history¦बुकिंग इतिहास¦બુકિંગ ઇતિહાસ
New booking¦नई बुकिंग¦નવી બુકિંગ
My bookings¦मेरी बुकिंग¦મારી બુકિંગ
Bookings¦बुकिंग¦બુકિંગ
Booking type¦बुकिंग का प्रकार¦બુકિંગનો પ્રકાર
Booking charge¦बुकिंग शुल्क¦બુકિંગ ચાર્જ
Booking fee¦बुकिंग शुल्क¦બુકિંગ ચાર્જ
Booking summary¦बुकिंग सारांश¦બુકિંગ સારાંશ
Booking information¦बुकिंग जानकारी¦બુકિંગ માહિતી
Booking progress¦बुकिंग की प्रगति¦બુકિંગની પ્રગતિ
Event details¦कार्यक्रम विवरण¦કાર્યક્રમની વિગતો
Choose a resource¦संसाधन चुनें¦સુવિધા પસંદ કરો
Date and availability¦तारीख और उपलब्धता¦તારીખ અને ઉપલબ્ધતા
Confirm and submit¦पुष्टि करके भेजें¦પુષ્ટિ કરીને મોકલો
Event purpose¦कार्यक्रम का उद्देश्य¦કાર્યક્રમનો હેતુ
Purpose¦उद्देश्य¦હેતુ
Purpose / event¦उद्देश्य / कार्यक्रम¦હેતુ / કાર્યક્રમ
Private function¦निजी कार्यक्रम¦ખાનગી કાર્યક્રમ
Common society event¦सामूहिक सोसाइटी कार्यक्रम¦સોસાયટીનો સામૂહિક કાર્યક્રમ
Emergency requirement¦आपातकालीन आवश्यकता¦કટોકટીની જરૂરિયાત
Private function at home or lane¦घर या गली में निजी कार्यक्रम¦ઘર કે શેરીમાં ખાનગી કાર્યક્રમ
Common plot¦कॉमन प्लॉट¦કોમન પ્લોટ
Common Plot 1¦कॉमन प्लॉट 1¦કોમન પ્લોટ 1
Common Plot 2¦कॉमन प्लॉट 2¦કોમન પ્લોટ 2
Common Plot 3¦कॉमन प्लॉट 3¦કોમન પ્લોટ 3
Common Plot {{v0}}¦कॉमन प्लॉट {{v0}}¦કોમન પ્લોટ {{v0}}
Plot¦प्लॉट¦પ્લોટ
Plot 1¦प्लॉट 1¦પ્લોટ 1
Plot 2¦प्लॉट 2¦પ્લોટ 2
Plot 3¦प्लॉट 3¦પ્લોટ 3
Choose a plot¦प्लॉट चुनें¦પ્લોટ પસંદ કરો
Society chairs¦सोसाइटी की कुर्सियाँ¦સોસાયટીની ખુરશીઓ
Number of chairs¦कुर्सियों की संख्या¦ખુરશીઓની સંખ્યા
Included chairs¦शामिल कुर्सियाँ¦સમાવિષ્ટ ખુરશીઓ
Requested chairs¦माँगी गई कुर्सियाँ¦માગેલી ખુરશીઓ
Chairs included¦कुर्सियाँ शामिल हैं¦ખુરશીઓ સામેલ છે
Total chairs¦कुल कुर्सियाँ¦કુલ ખુરશીઓ
Chair inventory¦कुर्सियों की उपलब्ध संख्या¦ખુરશીઓની ઉપલબ્ધ સંખ્યા
Chairs returned¦वापस की गई कुर्सियाँ¦પરત કરેલી ખુરશીઓ
Chair reservation window¦कुर्सियों का आरक्षण समय¦ખુરશીઓના આરક્ષણનો સમય
Chairs without a plot booking¦प्लॉट बुक किए बिना कुर्सियाँ¦પ્લોટ બુકિંગ વિના ખુરશીઓ
Space with utilities and chairs¦सुविधाओं और कुर्सियों सहित जगह¦સુવિધાઓ અને ખુરશીઓ સાથેની જગ્યા
Free¦निःशुल्क¦મફત
From¦से¦થી
From {{v0}}¦{{v0}} से¦{{v0}} થી
12 hours¦12 घंटे¦12 કલાક
24 hours¦24 घंटे¦24 કલાક
12 or 24 hours¦12 या 24 घंटे¦12 અથવા 24 કલાક
Duration¦अवधि¦સમયગાળો
Popular¦लोकप्रिय¦લોકપ્રિય
Subject to availability¦उपलब्धता के अधीन¦ઉપલબ્ધતાને આધીન
House¦घर¦ઘર
House number¦घर का नंबर¦ઘર નંબર
Row house¦रो हाउस¦રો હાઉસ
Row house No:¦रो हाउस नंबर:¦રો હાઉસ નંબર:
Row house No: {{v0}}¦रो हाउस नंबर: {{v0}}¦રો હાઉસ નંબર: {{v0}}
Row House No¦रो हाउस नंबर¦રો હાઉસ નંબર
Row house number¦रो हाउस नंबर¦રો હાઉસ નંબર
Row house number or lane details¦रो हाउस नंबर या गली का विवरण¦રો હાઉસ નંબર કે શેરીની વિગતો
Row house numbers (comma separated)¦रो हाउस नंबर (अल्पविराम से अलग करें)¦રો હાઉસ નંબર (અલ્પવિરામથી અલગ કરો)
Lane¦गली¦શેરી
Event name¦कार्यक्रम का नाम¦કાર્યક્રમનું નામ
Event date¦कार्यक्रम की तारीख¦કાર્યક્રમની તારીખ
Start time¦शुरू होने का समय¦શરૂ થવાનો સમય
End time¦समाप्ति का समय¦સમાપ્તિનો સમય
End date¦समाप्ति तारीख¦સમાપ્તિ તારીખ
Schedule¦समय-सारणी¦સમયપત્રક
Resource¦संसाधन¦સુવિધા
Review¦समीक्षा¦સમીક્ષા
Review booking¦बुकिंग की समीक्षा¦બુકિંગની સમીક્ષા
Review your booking¦अपनी बुकिंग की समीक्षा करें¦તમારી બુકિંગની સમીક્ષા કરો
Continue to event details¦कार्यक्रम विवरण पर जाएँ¦કાર્યક્રમની વિગતો પર જાઓ
Submit request¦अनुरोध भेजें¦વિનંતી મોકલો
Submit booking request¦बुकिंग अनुरोध भेजें¦બુકિંગ વિનંતી મોકલો
Request submitted¦अनुरोध भेज दिया गया¦વિનંતી મોકલાઈ ગઈ
Requests¦अनुरोध¦વિનંતીઓ
Your requests¦आपके अनुरोध¦તમારી વિનંતીઓ
Your booking requests¦आपके बुकिंग अनुरोध¦તમારી બુકિંગ વિનંતીઓ
Your events¦आपके कार्यक्रम¦તમારા કાર્યક્રમો
All requests¦सभी अनुरोध¦બધી વિનંતીઓ
New request¦नया अनुरोध¦નવી વિનંતી
Request chairs for an event¦कार्यक्रम के लिए कुर्सियाँ माँगें¦કાર્યક્રમ માટે ખુરશીઓ માગો
Track progress¦प्रगति देखें¦પ્રગતિ જુઓ
Hide progress¦प्रगति छिपाएँ¦પ્રગતિ છુપાવો
View booking history¦बुकिंग इतिहास देखें¦બુકિંગ ઇતિહાસ જુઓ
Create another request¦एक और अनुरोध बनाएँ¦બીજી વિનંતી બનાવો
Pending¦लंबित¦બાકી
Awaiting payment¦भुगतान की प्रतीक्षा¦ચુકવણીની રાહમાં
AwaitingPayment¦भुगतान की प्रतीक्षा¦ચુકવણીની રાહમાં
Approved¦स्वीकृत¦મંજૂર
Confirmed¦पुष्टि हो गई¦પુષ્ટિ થઈ ગઈ
Completed¦पूरा हुआ¦પૂર્ણ થયું
Closed¦बंद¦બંધ
Cancelled¦रद्द¦રદ
Rejected¦अस्वीकृत¦નામંજૂર
Submitted¦भेजा गया¦મોકલાયેલ
Verified¦सत्यापित¦ચકાસાયેલ
Created¦बनाया गया¦બનાવેલ
Failed¦विफल¦નિષ્ફળ
Synced¦समन्वयित¦સમન્વયિત
Resolved¦हल हो गया¦ઉકેલાયેલ
All¦सभी¦બધા
All statuses¦सभी स्थितियाँ¦બધી સ્થિતિઓ
All Months¦सभी महीने¦બધા મહિના
Needs review¦समीक्षा बाकी¦સમીક્ષા બાકી
Paid¦भुगतान हो गया¦ચૂકવાયેલ
Unpaid¦बिना भुगतान¦ચૂકવવાનું બાકી
In Review¦समीक्षा में¦સમીક્ષા હેઠળ
Under review¦समीक्षा में¦સમીક્ષા હેઠળ
Unassigned¦आवंटित नहीं¦ફાળવેલ નથી
Unavailable¦उपलब्ध नहीं¦ઉપલબ્ધ નથી
Current¦वर्तमान¦હાલનું
Read¦पढ़ा गया¦વાંચેલું
Unread¦बिना पढ़ा¦ન વાંચેલું
Status¦स्थिति¦સ્થિતિ
Status:¦स्थिति:¦સ્થિતિ:
Payment status¦भुगतान की स्थिति¦ચુકવણીની સ્થિતિ
Payment¦भुगतान¦ચુકવણી
Payments¦भुगतान¦ચુકવણીઓ
Payment history¦भुगतान इतिहास¦ચુકવણી ઇતિહાસ
Payment review¦भुगतान समीक्षा¦ચુકવણી સમીક્ષા
Payment activity¦भुगतान गतिविधि¦ચુકવણી પ્રવૃત્તિ
Payment & settlement¦भुगतान और निपटान¦ચુકવણી અને પતાવટ
Payment due¦भुगतान बाकी¦ચુકવણી બાકી
Payment complete¦भुगतान पूरा हुआ¦ચુકવણી પૂર્ણ થઈ
Payment verified¦भुगतान सत्यापित¦ચુકવણી ચકાસાઈ
Verification in progress¦सत्यापन जारी है¦ચકાસણી ચાલુ છે
Balance¦शेष राशि¦બાકી રકમ
Amount¦राशि¦રકમ
Amount (₹)¦राशि (₹)¦રકમ (₹)
Amount paid (₹)¦भुगतान की गई राशि (₹)¦ચૂકવેલી રકમ (₹)
Amount still due¦अभी बाकी राशि¦હજુ બાકી રકમ
Total amount due¦कुल बकाया राशि¦કુલ બાકી રકમ
Total Amount Paid¦कुल भुगतान राशि¦કુલ ચૂકવેલી રકમ
Current amount due:¦वर्तमान बकाया राशि:¦હાલની બાકી રકમ:
Refundable deposit¦वापसी योग्य जमा¦પરત મળવાપાત્ર ડિપોઝિટ
Refundable after inspection¦जाँच के बाद वापसी योग्य¦તપાસ પછી પરત મળવાપાત્ર
₹2,000 deposit¦₹2,000 जमा¦₹2,000 ડિપોઝિટ
₹3 per chair¦प्रति कुर्सी ₹3¦ખુરશી દીઠ ₹3
Refund due¦वापसी की राशि¦પરત આપવાની રકમ
Refund history¦वापसी इतिहास¦રિફંડ ઇતિહાસ
Additional due¦अतिरिक्त बकाया¦વધારાની બાકી રકમ
Deductions¦कटौतियाँ¦કપાત
Deductions (₹)¦कटौतियाँ (₹)¦કપાત (₹)
Retained cancellation fee (₹)¦रखा गया रद्दीकरण शुल्क (₹)¦રાખેલો રદ કરવાનો ચાર્જ (₹)
Final inspection¦अंतिम जाँच¦અંતિમ તપાસ
Complete final inspection¦अंतिम जाँच पूरी करें¦અંતિમ તપાસ પૂર્ણ કરો
Inspection notes¦जाँच टिप्पणियाँ¦તપાસની નોંધ
Save final settlement¦अंतिम निपटान सहेजें¦અંતિમ પતાવટ સાચવો
Record refund payout¦वापसी भुगतान दर्ज करें¦રિફંડ ચુકવણી નોંધો
Payout confirmation¦भुगतान पुष्टि¦ચુકવણીની પુષ્ટિ
Recipient¦प्राप्तकर्ता¦પ્રાપ્તકર્તા
Reference¦संदर्भ¦સંદર્ભ
Reference:¦संदर्भ:¦સંદર્ભ:
Transaction reference¦लेनदेन संदर्भ¦વ્યવહાર સંદર્ભ
Payment reference¦भुगतान संदर्भ¦ચુકવણી સંદર્ભ
Payment reference (UTR)¦भुगतान संदर्भ (UTR)¦ચુકવણી સંદર્ભ (UTR)
UPI transaction reference¦UPI लेनदेन संदर्भ¦UPI વ્યવહાર સંદર્ભ
12-digit UTR / reference¦12 अंकों का UTR / संदर्भ¦12 અંકનો UTR / સંદર્ભ
Method¦तरीका¦પદ્ધતિ
Cash¦नकद¦રોકડ
Cash payment¦नकद भुगतान¦રોકડ ચુકવણી
Paid on¦भुगतान तारीख¦ચુકવણી તારીખ
Paid Date¦भुगतान तारीख¦ચુકવણી તારીખ
Pay¦भुगतान करें¦ચૂકવો
Pay Now¦अभी भुगतान करें¦હમણાં ચૂકવો
Pay to¦इन्हें भुगतान करें¦આને ચૂકવો
Pay your bill¦अपने बिल का भुगतान करें¦તમારું બિલ ચૂકવો
Open UPI app¦UPI ऐप खोलें¦UPI ઍપ ખોલો
Copy UPI ID¦UPI ID कॉपी करें¦UPI ID કૉપી કરો
Scan with any UPI app¦किसी भी UPI ऐप से स्कैन करें¦કોઈપણ UPI ઍપથી સ્કૅન કરો
Secure UPI handoff¦सुरक्षित UPI भुगतान¦સુરક્ષિત UPI ચુકવણી
Submit for verification¦सत्यापन के लिए भेजें¦ચકાસણી માટે મોકલો
Submit for review¦समीक्षा के लिए भेजें¦સમીક્ષા માટે મોકલો
I've paid — add reference¦मैंने भुगतान किया है — संदर्भ जोड़ें¦મેં ચૂકવ્યું છે — સંદર્ભ ઉમેરો
Record cash & issue receipt¦नकद दर्ज करें और रसीद दें¦રોકડ નોંધો અને રસીદ આપો
Resident paying by cash?¦निवासी नकद भुगतान कर रहे हैं?¦રહેવાસી રોકડમાં ચૂકવે છે?
Receipt¦रसीद¦રસીદ
Receipt:¦रसीद:¦રસીદ:
Payment Receipt¦भुगतान रसीद¦ચુકવણી રસીદ
Event payment receipt¦कार्यक्रम भुगतान रसीद¦કાર્યક્રમ ચુકવણી રસીદ
Receipt Preview¦रसीद पूर्वावलोकन¦રસીદ પૂર્વદર્શન
Download receipt¦रसीद डाउनलोड करें¦રસીદ ડાઉનલોડ કરો
Download PDF¦PDF डाउनलोड करें¦PDF ડાઉનલોડ કરો
View proof¦प्रमाण देखें¦પુરાવો જુઓ
View payment proof¦भुगतान प्रमाण देखें¦ચુકવણીનો પુરાવો જુઓ
View invoice¦चालान देखें¦ઇન્વૉઇસ જુઓ
Payment proof (optional)¦भुगतान प्रमाण (वैकल्पिक)¦ચુકવણીનો પુરાવો (વૈકલ્પિક)
No proof attached.¦कोई प्रमाण संलग्न नहीं है।¦કોઈ પુરાવો જોડેલો નથી.
No payment required¦भुगतान आवश्यक नहीं¦ચુકવણી જરૂરી નથી
Estimated total¦अनुमानित कुल¦અંદાજિત કુલ
Server quote¦सर्वर का मूल्य¦સર્વરનો ભાવ
Server-quoted total¦सर्वर द्वारा बताई कुल राशि¦સર્વરે જણાવેલી કુલ રકમ
Total:¦कुल:¦કુલ:
Rate¦दर¦દર
Date¦तारीख¦તારીખ
Date (UTC)¦तारीख (UTC)¦તારીખ (UTC)
Month¦महीना¦મહિનો
Billing month¦बिलिंग महीना¦બિલિંગ મહિનો
Bill type¦बिल का प्रकार¦બિલનો પ્રકાર
Bill¦बिल¦બિલ
Bill #¦बिल #¦બિલ #
Booking #¦बुकिंग #¦બુકિંગ #
Request #¦अनुरोध #¦વિનંતી #
Payment #¦भुगतान #¦ચુકવણી #
Payment ID¦भुगतान ID¦ચુકવણી ID
New bill¦नया बिल¦નવું બિલ
Edit Bill¦बिल बदलें¦બિલ બદલો
Edit Bill Details¦बिल विवरण बदलें¦બિલની વિગતો બદલો
View Bill¦बिल देखें¦બિલ જુઓ
Society bills¦सोसाइटी के बिल¦સોસાયટીના બિલ
Unpaid bills¦बकाया बिल¦બાકી બિલ
Due date¦अंतिम तारीख¦અંતિમ તારીખ
Due:¦बकाया:¦બાકી:
Credit¦जमा समायोजन¦જમા સમાયોજન
Charge¦शुल्क¦ચાર્જ
Extra charge¦अतिरिक्त शुल्क¦વધારાનો ચાર્જ
Extra charges:¦अतिरिक्त शुल्क:¦વધારાના ચાર્જ:
Give credit¦जमा समायोजन दें¦જમા સમાયોજન આપો
Add charge¦शुल्क जोड़ें¦ચાર્જ ઉમેરો
Add extra charge¦अतिरिक्त शुल्क जोड़ें¦વધારાનો ચાર્જ ઉમેરો
Add an extra charge¦अतिरिक्त शुल्क जोड़ें¦વધારાનો ચાર્જ ઉમેરો
Give credit (reduce amount due)¦जमा समायोजन दें (बकाया घटाएँ)¦જમા સમાયોજન આપો (બાકી રકમ ઘટાડો)
Give credit or add a charge¦जमा समायोजन या शुल्क जोड़ें¦જમા સમાયોજન કે ચાર્જ ઉમેરો
Covered by credit¦जमा समायोजन से पूरा हुआ¦જમા સમાયોજનથી પૂર્ણ
Paid / credited¦भुगतान / समायोजित¦ચૂકવાયેલ / સમાયોજિત
Paid or credited¦भुगतान या समायोजित¦ચૂકવાયેલ કે સમાયોજિત
Amount credited:¦समायोजित राशि:¦સમાયોજિત રકમ:
Added to dues¦बकाया में जोड़ा गया¦બાકી રકમમાં ઉમેર્યું
Maintenance¦रखरखाव¦મેન્ટેનન્સ
Maintenance due¦रखरखाव बकाया¦મેન્ટેનન્સ બાકી
Maintenance accounts¦रखरखाव खाते¦મેન્ટેનન્સ ખાતાં
Monthly billing¦मासिक बिलिंग¦માસિક બિલિંગ
Generate Bill¦बिल बनाएँ¦બિલ બનાવો
Generate New Bills¦नए बिल बनाएँ¦નવાં બિલ બનાવો
Generate previewed bills¦पूर्वावलोकित बिल बनाएँ¦પૂર્વદર્શિત બિલ બનાવો
Preview bills¦बिल पूर्वावलोकन¦બિલ પૂર્વદર્શન
Preview:¦पूर्वावलोकन:¦પૂર્વદર્શન:
Bill all known row houses¦सभी दर्ज रो हाउस के बिल बनाएँ¦બધા નોંધાયેલા રો હાઉસનાં બિલ બનાવો
Already exists — skip¦पहले से मौजूद — छोड़ें¦પહેલેથી છે — છોડો
Choose bill¦बिल चुनें¦બિલ પસંદ કરો
Select a bill¦बिल चुनें¦બિલ પસંદ કરો
Apply to selected bill¦चुने हुए बिल पर लागू करें¦પસંદ કરેલા બિલ પર લાગુ કરો
Expense¦खर्च¦ખર્ચ
Add Expense¦खर्च जोड़ें¦ખર્ચ ઉમેરો
Add New Expense¦नया खर्च जोड़ें¦નવો ખર્ચ ઉમેરો
Save Expense¦खर्च सहेजें¦ખર્ચ સાચવો
Cancel expense¦खर्च रद्द करें¦ખર્ચ રદ કરો
Expense cancelled¦खर्च रद्द हुआ¦ખર્ચ રદ થયો
Expense Distribution¦खर्च का वितरण¦ખર્ચનું વિતરણ
Total Expenses¦कुल खर्च¦કુલ ખર્ચ
Total spending¦कुल खर्च¦કુલ ખર્ચ
Breakdown by Category¦श्रेणी अनुसार विवरण¦શ્રેણી પ્રમાણે વિગતો
Category¦श्रेणी¦શ્રેણી
General¦सामान्य¦સામાન્ય
Alert¦चेतावनी¦ચેતવણી
Electrical¦बिजली¦વીજળી
Plumbing¦प्लंबिंग¦પ્લમ્બિંગ
Security¦सुरक्षा¦સુરક્ષા
Other¦अन्य¦અન્ય
Others¦अन्य¦અન્ય
Salary¦वेतन¦પગાર
Repairs¦मरम्मत¦સમારકામ
Utility¦उपयोगिता¦ઉપયોગિતા
Penalty¦जुर्माना¦દંડ
Amount (₹)¦राशि (₹)¦રકમ (₹)
Action¦कार्य¦કાર્ય
Actions¦कार्य¦કાર્યો
Approve¦स्वीकार करें¦મંજૂર કરો
Reject¦अस्वीकार करें¦નામંજૂર કરો
Verify¦सत्यापित करें¦ચકાસો
Cancel¦रद्द करें¦રદ કરો
Back¦वापस¦પાછા
Close¦बंद करें¦બંધ કરો
Next¦अगला¦આગળ
Previous¦पिछला¦પાછળ
Refresh¦ताज़ा करें¦તાજું કરો
Retry¦फिर कोशिश करें¦ફરી પ્રયાસ કરો
Try again¦फिर कोशिश करें¦ફરી પ્રયાસ કરો
Retry check¦जाँच फिर करें¦ફરી તપાસો
Update¦अपडेट करें¦અપડેટ કરો
Save¦सहेजें¦સાચવો
Remove¦हटाएँ¦દૂર કરો
View¦देखें¦જુઓ
View All¦सभी देखें¦બધું જુઓ
View account¦खाता देखें¦ખાતું જુઓ
View changes¦बदलाव देखें¦ફેરફારો જુઓ
Read More¦और पढ़ें¦વધુ વાંચો
Read full notice¦पूरी सूचना पढ़ें¦આખી સૂચના વાંચો
Show less¦कम दिखाएँ¦ઓછું બતાવો
Mark as read¦पढ़ा हुआ चिह्नित करें¦વાંચેલું દર્શાવો
Search by Name or Row House...¦नाम या रो हाउस से खोजें...¦નામ કે રો હાઉસથી શોધો...
Find payment¦भुगतान खोजें¦ચુકવણી શોધો
Apply filters¦फ़िल्टर लागू करें¦ફિલ્ટર લાગુ કરો
Clear filters¦फ़िल्टर हटाएँ¦ફિલ્ટર દૂર કરો
Reset filters¦फ़िल्टर रीसेट करें¦ફિલ્ટર રીસેટ કરો
Selected:¦चयनित:¦પસંદ કરેલ:
To¦तक¦સુધી
Until¦तक¦સુધી
Page¦पृष्ठ¦પાનું
Type¦प्रकार¦પ્રકાર
Title¦शीर्षक¦શીર્ષક
Description¦विवरण¦વર્ણન
Reason¦कारण¦કારણ
Message¦संदेश¦સંદેશ
Content / Details¦सामग्री / विवरण¦લખાણ / વિગતો
Expiry date¦समाप्ति तारीख¦સમાપ્તિ તારીખ
Expires:¦समाप्ति:¦સમાપ્તિ:
Posted on¦प्रकाशन तारीख¦પ્રકાશન તારીખ
Posted by Secretary¦सचिव द्वारा प्रकाशित¦સચિવ દ્વારા પ્રકાશિત
Post New Notice¦नई सूचना प्रकाशित करें¦નવી સૂચના પ્રકાશિત કરો
Publish Notice¦सूचना प्रकाशित करें¦સૂચના પ્રકાશિત કરો
Edit Notice¦सूचना बदलें¦સૂચના બદલો
Update Notice¦सूचना अपडेट करें¦સૂચના અપડેટ કરો
Delete Notice¦सूचना हटाएँ¦સૂચના કાઢો
Mark as Urgent Notice?¦अत्यावश्यक सूचना के रूप में चिह्नित करें?¦તાત્કાલિક સૂચના તરીકે દર્શાવવી?
Urgent¦अत्यावश्यक¦તાત્કાલિક
Notice¦सूचना¦સૂચના
Broadcast to residents¦निवासियों को सूचना दें¦રહેવાસીઓને જાણ કરો
Latest Updates¦नवीनतम अपडेट¦તાજેતરના અપડેટ
Open Complaints¦खुली शिकायतें¦ખુલ્લી ફરિયાદો
Helpdesk Overview¦सहायता केंद्र सारांश¦મદદ કેન્દ્ર સારાંશ
Helpdesk Tickets¦सहायता अनुरोध¦મદદ વિનંતીઓ
Raise Ticket¦अनुरोध दर्ज करें¦વિનંતી નોંધાવો
Raise New Ticket¦नया अनुरोध दर्ज करें¦નવી વિનંતી નોંધાવો
Raise a ticket¦अनुरोध दर्ज करें¦વિનંતી નોંધાવો
Submit Ticket¦अनुरोध भेजें¦વિનંતી મોકલો
View tickets¦अनुरोध देखें¦વિનંતીઓ જુઓ
Report¦शिकायत करें¦ફરિયાદ કરો
Raised¦दर्ज किया गया¦નોંધાયેલ
Resolution:¦समाधान:¦ઉકેલ:
Mark Resolved¦हल हुआ चिह्नित करें¦ઉકેલાયેલ દર્શાવો
Quick Actions¦त्वरित कार्य¦ઝડપી કાર્યો
Quick Tasks¦त्वरित कार्य¦ઝડપી કાર્યો
Manage All¦सभी प्रबंधित करें¦બધાનું સંચાલન કરો
Need help?¦मदद चाहिए?¦મદદ જોઈએ છે?
All Clear¦सब ठीक है¦બધું ઠીક છે
Emergency Contacts¦आपातकालीन संपर्क¦કટોકટીના સંપર્ક
Service Providers & Office¦सेवा प्रदाता और कार्यालय¦સેવા પ્રદાતાઓ અને કાર્યાલય
Contacts¦संपर्क¦સંપર્કો
Mobile¦मोबाइल¦મોબાઇલ
Phone number¦फ़ोन नंबर¦ફોન નંબર
Full Name¦पूरा नाम¦પૂરું નામ
Email Address¦ईमेल पता¦ઈમેલ સરનામું
Resident¦निवासी¦રહેવાસી
Administrator¦प्रशासक¦વહીવટકર્તા
Admin¦प्रशासक¦વહીવટકર્તા
Secretary¦सचिव¦સચિવ
Owner¦मालिक¦માલિક
Tenant¦किरायेदार¦ભાડૂત
Resident type¦निवासी का प्रकार¦રહેવાસીનો પ્રકાર
Welcome¦स्वागत है¦સ્વાગત છે
Welcome,¦स्वागत है,¦સ્વાગત છે,
Welcome Back¦फिर स्वागत है¦ફરી સ્વાગત છે
Welcome home¦घर पर स्वागत है¦ઘરે સ્વાગત છે
Welcome home, {{v0}}!¦घर पर स्वागत है, {{v0}}!¦ઘરે સ્વાગત છે, {{v0}}!
Good Morning¦सुप्रभात¦સુપ્રભાત
Good Afternoon¦नमस्कार¦નમસ્કાર
Good Evening¦शुभ संध्या¦શુભ સાંજ
Sign In¦साइन इन करें¦સાઇન ઇન કરો
Sign Out¦साइन आउट करें¦સાઇન આઉટ કરો
Sign out¦साइन आउट करें¦સાઇન આઉટ કરો
Signing In...¦साइन इन हो रहा है...¦સાઇન ઇન થઈ રહ્યું છે...
Already have an account?¦पहले से खाता है?¦પહેલેથી ખાતું છે?
Don't have an account?¦खाता नहीं है?¦ખાતું નથી?
Create Account¦खाता बनाएँ¦ખાતું બનાવો
Register Now¦अभी पंजीकरण करें¦હમણાં નોંધણી કરો
Join Sur Shakti¦सुर शक्ति से जुड़ें¦સુર શક્તિ સાથે જોડાઓ
Resident Self-Registration¦निवासी स्वयं-पंजीकरण¦રહેવાસી સ્વ-નોંધણી
Society Code (Ask Secretary)¦सोसाइटी कोड (सचिव से पूछें)¦સોસાયટી કોડ (સચિવને પૂછો)
Password¦पासवर्ड¦પાસવર્ડ
Current password¦वर्तमान पासवर्ड¦હાલનો પાસવર્ડ
New password¦नया पासवर्ड¦નવો પાસવર્ડ
Confirm password¦पासवर्ड की पुष्टि करें¦પાસવર્ડની પુષ્ટિ કરો
Confirm new password¦नए पासवर्ड की पुष्टि करें¦નવા પાસવર્ડની પુષ્ટિ કરો
Enter current password¦वर्तमान पासवर्ड दर्ज करें¦હાલનો પાસવર્ડ દાખલ કરો
Enter new password¦नया पासवर्ड दर्ज करें¦નવો પાસવર્ડ દાખલ કરો
Change Password¦पासवर्ड बदलें¦પાસવર્ડ બદલો
Reset Password¦पासवर्ड रीसेट करें¦પાસવર્ડ રીસેટ કરો
Create Password¦पासवर्ड बनाएँ¦પાસવર્ડ બનાવો
Set your password¦अपना पासवर्ड बनाएँ¦તમારો પાસવર્ડ બનાવો
Update Password¦पासवर्ड अपडेट करें¦પાસવર્ડ અપડેટ કરો
Update & Continue¦अपडेट करके आगे बढ़ें¦અપડેટ કરીને આગળ વધો
Update Contact¦संपर्क अपडेट करें¦સંપર્ક અપડેટ કરો
Resend password setup link¦पासवर्ड बनाने का लिंक फिर भेजें¦પાસવર્ડ બનાવવાની લિંક ફરી મોકલો
Resend¦फिर भेजें¦ફરી મોકલો
Loading...¦लोड हो रहा है...¦લોડ થઈ રહ્યું છે...
Loading…¦लोड हो रहा है…¦લોડ થઈ રહ્યું છે…
Saving…¦सहेजा जा रहा है…¦સાચવાઈ રહ્યું છે…
Working…¦कार्य जारी है…¦કામ ચાલુ છે…
Submitting…¦भेजा जा रहा है…¦મોકલાઈ રહ્યું છે…
Submitting request…¦अनुरोध भेजा जा रहा है…¦વિનંતી મોકલાઈ રહી છે…
Processing...¦प्रक्रिया जारी है...¦પ્રક્રિયા ચાલુ છે...
Updating...¦अपडेट हो रहा है...¦અપડેટ થઈ રહ્યું છે...
Uploading...¦अपलोड हो रहा है...¦અપલોડ થઈ રહ્યું છે...
Verifying...¦सत्यापन जारी है...¦ચકાસણી ચાલુ છે...
Sending...¦भेजा जा रहा है...¦મોકલાઈ રહ્યું છે...
Sending…¦भेजा जा रहा है…¦મોકલાઈ રહ્યું છે…
Generating…¦बनाया जा रहा है…¦બનાવાઈ રહ્યું છે…
Resetting...¦रीसेट हो रहा है...¦રીસેટ થઈ રહ્યું છે...
Generating PDF...¦PDF बन रहा है...¦PDF બની રહ્યું છે...
Loading accounts…¦खाते लोड हो रहे हैं…¦ખાતાં લોડ થઈ રહ્યાં છે…
Loading activity…¦गतिविधि लोड हो रही है…¦પ્રવૃત્તિ લોડ થઈ રહી છે…
Loading balance…¦शेष राशि लोड हो रही है…¦બાકી રકમ લોડ થઈ રહી છે…
Loading bills…¦बिल लोड हो रहे हैं…¦બિલ લોડ થઈ રહ્યાં છે…
Loading bookings…¦बुकिंग लोड हो रही हैं…¦બુકિંગ લોડ થઈ રહ્યાં છે…
Loading directory...¦संपर्क सूची लोड हो रही है...¦સંપર્ક સૂચિ લોડ થઈ રહી છે...
Loading inbox…¦इनबॉक्स लोड हो रहा है…¦ઇનબૉક્સ લોડ થઈ રહ્યું છે…
Loading notifications…¦सूचनाएँ लोड हो रही हैं…¦સૂચનાઓ લોડ થઈ રહી છે…
Loading payment history…¦भुगतान इतिहास लोड हो रहा है…¦ચુકવણી ઇતિહાસ લોડ થઈ રહ્યો છે…
Loading payment journey…¦भुगतान विवरण लोड हो रहा है…¦ચુકવણી વિગતો લોડ થઈ રહી છે…
Loading payment review…¦भुगतान समीक्षा लोड हो रही है…¦ચુકવણી સમીક્ષા લોડ થઈ રહી છે…
Loading payments to review…¦समीक्षा के भुगतान लोड हो रहे हैं…¦સમીક્ષા માટે ચુકવણીઓ લોડ થઈ રહી છે…
Loading tickets...¦अनुरोध लोड हो रहे हैं...¦વિનંતીઓ લોડ થઈ રહી છે...
Checking live availability and pricing…¦उपलब्धता और कीमत जाँची जा रही है…¦ઉપલબ્ધતા અને ભાવ તપાસાઈ રહ્યાં છે…
Available ·¦उपलब्ध ·¦ઉપલબ્ધ ·
Only¦केवल¦ફક્ત
of¦में से¦માંથી
via¦द्वारा¦દ્વારા
chairs and¦कुर्सियाँ और¦ખુરશીઓ અને
chairs are available.¦कुर्सियाँ उपलब्ध हैं।¦ખુરશીઓ ઉપલબ્ધ છે.
plots free¦प्लॉट उपलब्ध¦પ્લોટ ઉપલબ્ધ
remains to be refunded¦वापस करना बाकी है¦પરત આપવાના બાકી છે
is pending review¦समीक्षा के लिए लंबित है¦સમીક્ષા માટે બાકી છે
is unavailable for this period.¦इस अवधि में उपलब्ध नहीं है।¦આ સમયગાળામાં ઉપલબ્ધ નથી.
{{v0}} chairs included¦{{v0}} कुर्सियाँ शामिल¦{{v0}} ખુરશીઓ સામેલ
{{v0}} society chairs¦सोसाइटी की {{v0}} कुर्सियाँ¦સોસાયટીની {{v0}} ખુરશીઓ
{{v0}} chairs · {{v1}}¦{{v0}} कुर्सियाँ · {{v1}}¦{{v0}} ખુરશીઓ · {{v1}}
{{v0}} chairs · {{v1}}{{v2}}¦{{v0}} कुर्सियाँ · {{v1}}{{v2}}¦{{v0}} ખુરશીઓ · {{v1}}{{v2}}
{{v0}} due¦{{v0}} बकाया¦{{v0}} બાકી
{{v0}} introduction¦{{v0}} परिचय¦{{v0}} પરિચય
For House {{v0}}¦घर {{v0}} के लिए¦ઘર {{v0}} માટે
Call {{v0}}¦{{v0}} को कॉल करें¦{{v0}} ને કૉલ કરો
Call {{v0}} at {{v1}}¦{{v0}} को {{v1}} पर कॉल करें¦{{v0}} ને {{v1}} પર કૉલ કરો
Skip to content¦मुख्य सामग्री पर जाएँ¦મુખ્ય સામગ્રી પર જાઓ
Open navigation¦मेन्यू खोलें¦મેનૂ ખોલો
Close navigation¦मेन्यू बंद करें¦મેનૂ બંધ કરો
Open all menus¦सभी मेन्यू खोलें¦બધાં મેનૂ ખોલો
Collapse sidebar¦साइडबार समेटें¦સાઇડબાર સંકોચો
Expand sidebar¦साइडबार फैलाएँ¦સાઇડબાર વિસ્તારો
Go to home¦होम पर जाएँ¦હોમ પર જાઓ
Main navigation¦मुख्य नेविगेशन¦મુખ્ય નેવિગેશન
Community navigation¦सोसाइटी नेविगेशन¦સોસાયટી નેવિગેશન
Billing pages¦बिलिंग पृष्ठ¦બિલિંગ પાનાં
Dashboard shortcuts¦डैशबोर्ड शॉर्टकट¦ડેશબોર્ડ શૉર્ટકટ
Resident widgets¦निवासी कार्ड¦રહેવાસી કાર્ડ
Admin widgets¦प्रशासक कार्ड¦વહીવટકર્તા કાર્ડ
Choose dashboard widget¦डैशबोर्ड कार्ड चुनें¦ડેશબોર્ડ કાર્ડ પસંદ કરો
Switch to dark mode¦डार्क मोड चालू करें¦ડાર્ક મોડ ચાલુ કરો
Switch to light mode¦लाइट मोड चालू करें¦લાઇટ મોડ ચાલુ કરો
Switch to Dark Mode¦डार्क मोड चालू करें¦ડાર્ક મોડ ચાલુ કરો
Switch to Light Mode¦लाइट मोड चालू करें¦લાઇટ મોડ ચાલુ કરો
Close payment¦भुगतान बंद करें¦ચુકવણી બંધ કરો
Close receipt¦रसीद बंद करें¦રસીદ બંધ કરો
Close reminder¦रिमाइंडर बंद करें¦રિમાઇન્ડર બંધ કરો
Close generate bills¦बिल निर्माण बंद करें¦બિલ બનાવવાનું બંધ કરો
Filter bookings by status¦स्थिति से बुकिंग छाँटें¦સ્થિતિ પ્રમાણે બુકિંગ ગાળો
Filter bills by status¦स्थिति से बिल छाँटें¦સ્થિતિ પ્રમાણે બિલ ગાળો
Filter by bill ID¦बिल ID से छाँटें¦બિલ ID પ્રમાણે ગાળો
Filter by row house¦रो हाउस से छाँटें¦રો હાઉસ પ્રમાણે ગાળો
Filter helpdesk tickets¦सहायता अनुरोध छाँटें¦મદદ વિનંતીઓ ગાળો
Maintenance sections¦रखरखाव अनुभाग¦મેન્ટેનન્સ વિભાગો
Event management sections¦कार्यक्रम प्रबंधन अनुभाग¦કાર્યક્રમ વ્યવસ્થાપન વિભાગો
Payment history pages¦भुगतान इतिहास पृष्ठ¦ચુકવણી ઇતિહાસ પાનાં
Next payments¦अगले भुगतान¦આગળની ચુકવણીઓ
Previous payments¦पिछले भुगतान¦પાછળની ચુકવણીઓ
Payment steps¦भुगतान के चरण¦ચુકવણીનાં પગલાં
1. Make payment¦1. भुगतान करें¦1. ચુકવણી કરો
2. Submit reference¦2. संदर्भ भेजें¦2. સંદર્ભ મોકલો
Step 1¦चरण 1¦પગલું 1
Step 1 of 2¦2 में से चरण 1¦2 માંથી પગલું 1
Step 2¦चरण 2¦પગલું 2
Step 3¦चरण 3¦પગલું 3
SwIpe¦स्वाइप करें¦સ્વાઇપ કરો
Select...¦चुनें...¦પસંદ કરો...
Bank date¦बैंक तारीख¦બેંક તારીખ
Bank reference¦बैंक संदर्भ¦બેંક સંદર્ભ
Add bank record¦बैंक रिकॉर्ड जोड़ें¦બેંક રેકૉર્ડ ઉમેરો
Link bank payment¦बैंक भुगतान जोड़ें¦બેંક ચુકવણી જોડો
Matched to bank record¦बैंक रिकॉर्ड से मिलान हुआ¦બેંક રેકૉર્ડ સાથે મેળ થયો
Not linked¦जुड़ा नहीं¦જોડાયેલ નથી
Not submitted¦भेजा नहीं गया¦મોકલાયેલ નથી
Reference not submitted¦संदर्भ नहीं भेजा गया¦સંદર્ભ મોકલાયેલ નથી
Record¦दर्ज करें¦નોંધો
Record number¦रिकॉर्ड नंबर¦રેકૉર્ડ નંબર
Result¦परिणाम¦પરિણામ
Row¦पंक्ति¦પંક્તિ
All activity¦सभी गतिविधियाँ¦બધી પ્રવૃત્તિઓ
Activity history¦गतिविधि इतिहास¦પ્રવૃત્તિ ઇતિહાસ
Show activity¦गतिविधि देखें¦પ્રવૃત્તિ જુઓ
Show activity for¦इनकी गतिविधि देखें¦આની પ્રવૃત્તિ જુઓ
History for¦इनका इतिहास¦આનો ઇતિહાસ
Review:¦समीक्षा:¦સમીક્ષા:
Previously:¦पहले:¦પહેલાં:
Current:¦वर्तमान:¦હાલ:
Now:¦अब:¦હવે:
After removal:¦हटाने के बाद:¦દૂર કર્યા પછી:
Current server value:¦सर्वर का वर्तमान मूल्य:¦સર્વરનું હાલનું મૂલ્ય:
Reason for this change¦इस बदलाव का कारण¦આ ફેરફારનું કારણ
Reason for rejection:¦अस्वीकार करने का कारण:¦નામંજૂર કરવાનું કારણ:
Reason for rejecting this payment:¦भुगतान अस्वीकार करने का कारण:¦ચુકવણી નામંજૂર કરવાનું કારણ:
Optional approval note:¦स्वीकृति टिप्पणी (वैकल्पिक):¦મંજૂરીની નોંધ (વૈકલ્પિક):
Review note or rejection reason¦समीक्षा टिप्पणी या अस्वीकृति का कारण¦સમીક્ષાની નોંધ કે નામંજૂરીનું કારણ
Required when rejecting¦अस्वीकार करते समय आवश्यक¦નામંજૂર કરતી વખતે જરૂરી
Required for every event¦हर कार्यक्रम के लिए आवश्यक¦દરેક કાર્યક્રમ માટે જરૂરી
* Required for verification¦* सत्यापन के लिए आवश्यक¦* ચકાસણી માટે જરૂરી
Accounts & residents¦खाते और निवासी¦ખાતાં અને રહેવાસીઓ
Row house accounts¦रो हाउस खाते¦રો હાઉસ ખાતાં
Row house account history¦रो हाउस खाता इतिहास¦રો હાઉસ ખાતાનો ઇતિહાસ
Row house resident assignment¦रो हाउस निवासी आवंटन¦રો હાઉસ રહેવાસી ફાળવણી
Billing resident¦बिल के लिए जिम्मेदार निवासी¦બિલ માટે જવાબદાર રહેવાસી
Load assignment¦आवंटन देखें¦ફાળવણી જુઓ
Select resident¦निवासी चुनें¦રહેવાસી પસંદ કરો
Confirm assignment¦आवंटन की पुष्टि करें¦ફાળવણીની પુષ્ટિ કરો
End current assignment¦वर्तमान आवंटन समाप्त करें¦હાલની ફાળવણી સમાપ્ત કરો
Earlier entries need a bill¦पुरानी प्रविष्टियों के लिए बिल चाहिए¦જૂની નોંધો માટે બિલ જરૂરી છે
Approval queue¦स्वीकृति सूची¦મંજૂરી યાદી
Expense approval & bank matching¦खर्च स्वीकृति और बैंक मिलान¦ખર્ચ મંજૂરી અને બેંક મેળવણી
Money paid from the bank¦बैंक से चुकाई गई राशि¦બેંકમાંથી ચૂકવેલી રકમ
Available funds¦उपलब्ध राशि¦ઉપલબ્ધ ભંડોળ
Payments received¦प्राप्त भुगतान¦મળેલી ચુકવણીઓ
Payments awaiting review¦समीक्षा की प्रतीक्षा में भुगतान¦સમીક્ષાની રાહમાં ચુકવણીઓ
Residents with unpaid bills¦बकाया बिल वाले निवासी¦બાકી બિલવાળા રહેવાસીઓ
Payment reminders¦भुगतान रिमाइंडर¦ચુકવણી રિમાઇન્ડર
Remind All¦सभी को याद दिलाएँ¦બધાને યાદ અપાવો
Send reminders¦रिमाइंडर भेजें¦રિમાઇન્ડર મોકલો
Sending reminders…¦रिमाइंडर भेजे जा रहे हैं…¦રિમાઇન્ડર મોકલાઈ રહ્યાં છે…
Refresh payments¦भुगतान ताज़ा करें¦ચુકવણીઓ તાજી કરો
Refresh queue¦सूची ताज़ा करें¦યાદી તાજી કરો
Refresh status¦स्थिति ताज़ा करें¦સ્થિતિ તાજી કરો
Refresh workflow¦कार्यप्रवाह ताज़ा करें¦કાર્યપ્રવાહ તાજો કરો
Reload bills¦बिल फिर लोड करें¦બિલ ફરી લોડ કરો
Export CSV¦CSV निर्यात करें¦CSV નિકાસ કરો
Bulk Add¦एक साथ जोड़ें¦એકસાથે ઉમેરો
Bulk Import Residents¦निवासियों का सामूहिक आयात¦રહેવાસીઓની સામૂહિક આયાત
Start Import¦आयात शुरू करें¦આયાત શરૂ કરો
Import complete¦आयात पूरा हुआ¦આયાત પૂર્ણ થઈ
Instructions:¦निर्देश:¦સૂચનાઓ:
Use columns:¦इन कॉलम का उपयोग करें:¦આ કૉલમ વાપરો:
Click to select Excel file¦Excel फ़ाइल चुनने के लिए क्लिक करें¦Excel ફાઇલ પસંદ કરવા ક્લિક કરો
.xlsx only, up to 5 MB¦केवल .xlsx, अधिकतम 5 MB¦ફક્ત .xlsx, મહત્તમ 5 MB
Upload bill / receipt¦बिल / रसीद अपलोड करें¦બિલ / રસીદ અપલોડ કરો
Notification inbox¦सूचना इनबॉक्स¦સૂચના ઇનબૉક્સ
Admin Overview¦प्रशासक सारांश¦વહીવટકર્તા સારાંશ
All Residents (¦सभी निवासी (¦બધા રહેવાસીઓ (
(Row house¦(रो हाउस¦(રો હાઉસ
· Row house¦· रो हाउस¦· રો હાઉસ
· Bill #¦· बिल #¦· બિલ #
· Due¦· बकाया¦· બાકી
· Changed by¦· बदलाव करने वाले¦· ફેરફાર કરનાર
· New amount due:¦· नई बकाया राशि:¦· નવી બાકી રકમ:
Includes ₹¦इसमें शामिल हैं ₹¦આમાં સામેલ છે ₹
late fee¦विलंब शुल्क¦વિલંબ ચાર્જ
charges¦शुल्क¦ચાર્જ
created ·¦बनाए गए ·¦બનાવ્યાં ·
invitations sent ·¦निमंत्रण भेजे गए ·¦આમંત્રણો મોકલ્યાં ·
skipped¦छोड़े गए¦છોડ્યાં
bills; skipped¦बिल; छोड़े गए¦બિલ; છોડ્યાં
existing bills.¦मौजूदा बिल।¦હાલનાં બિલ.
record is¦रिकॉर्ड है¦રેકૉર્ડ છે
records are¦रिकॉर्ड हैं¦રેકૉર્ડ છે
refund¦वापसी¦રિફંડ
name unavailable¦नाम उपलब्ध नहीं¦નામ ઉપલબ્ધ નથી
Default¦डिफ़ॉल्ट¦ડિફૉલ્ટ
Last failure:¦पिछली विफलता:¦છેલ્લી નિષ્ફળતા:
Mark Paid (Cash)¦भुगतान हुआ दर्ज करें (नकद)¦ચૂકવાયેલ નોંધો (રોકડ)
Open WhatsApp¦WhatsApp खोलें¦WhatsApp ખોલો
Open WhatsApp (phone)¦WhatsApp खोलें (फ़ोन)¦WhatsApp ખોલો (ફોન)
Open WhatsApp Web¦WhatsApp Web खोलें¦WhatsApp Web ખોલો
Copy message¦संदेश कॉपी करें¦સંદેશ કૉપી કરો
WhatsApp payment reminder¦WhatsApp भुगतान रिमाइंडर¦WhatsApp ચુકવણી રિમાઇન્ડર
Resident's WhatsApp number¦निवासी का WhatsApp नंबर¦રહેવાસીનો WhatsApp નંબર
Backend update required¦बैकएंड अपडेट आवश्यक¦બૅકએન્ડ અપડેટ જરૂરી
Event Booking API is not available on the connected server.¦जुड़े सर्वर पर कार्यक्रम बुकिंग API उपलब्ध नहीं है।¦જોડાયેલા સર્વર પર કાર્યક્રમ બુકિંગ API ઉપલબ્ધ નથી.
Event booking service could not be reached¦कार्यक्रम बुकिंग सेवा से संपर्क नहीं हो सका¦કાર્યક્રમ બુકિંગ સેવા સાથે સંપર્ક ન થઈ શક્યો
Event booking service is not deployed¦कार्यक्रम बुकिंग सेवा उपलब्ध नहीं कराई गई है¦કાર્યક્રમ બુકિંગ સેવા સ્થાપિત નથી
Event booking service is unavailable¦कार्यक्रम बुकिंग सेवा उपलब्ध नहीं है¦કાર્યક્રમ બુકિંગ સેવા ઉપલબ્ધ નથી
Availability settings¦उपलब्धता सेटिंग्स¦ઉપલબ્ધતા સેટિંગ્સ
Committee controls¦समिति नियंत्रण¦સમિતિ નિયંત્રણો
Committee workspace¦समिति कार्यक्षेत्र¦સમિતિ કાર્યક્ષેત્ર
Close a common plot¦कॉमन प्लॉट बंद रखें¦કોમન પ્લોટ બંધ રાખો
Add closure¦बंदी जोड़ें¦બંધ સમય ઉમેરો
Save inventory¦कुर्सियों की संख्या सहेजें¦ખુરશીઓની સંખ્યા સાચવો
Festival or maintenance¦त्योहार या रखरखाव¦તહેવાર કે મેન્ટેનન્સ
Remove the closure for Common Plot {{v0}}?¦कॉमन प्लॉट {{v0}} की बंदी हटाएँ?¦કોમન પ્લોટ {{v0}} નો બંધ સમય દૂર કરવો?
Review, payment and settlement¦समीक्षा, भुगतान और निपटान¦સમીક્ષા, ચુકવણી અને પતાવટ
Advance booking¦अग्रिम बुकिंग¦અગાઉથી બુકિંગ
Before you book¦बुकिंग से पहले¦બુકિંગ પહેલાં
Society policy¦सोसाइटी की नीति¦સોસાયટીની નીતિ
Society rules¦सोसाइटी के नियम¦સોસાયટીના નિયમો
Full booking, chair and refund rules¦बुकिंग, कुर्सी और वापसी के पूरे नियम¦બુકિંગ, ખુરશી અને રિફંડના સંપૂર્ણ નિયમો
Booking and availability¦बुकिंग और उपलब्धता¦બુકિંગ અને ઉપલબ્ધતા
Booking highlights¦बुकिंग की मुख्य बातें¦બુકિંગની મુખ્ય બાબતો
Booking information and contacts¦बुकिंग जानकारी और संपर्क¦બુકિંગ માહિતી અને સંપર્કો
Bookings and queries¦बुकिंग और सवाल¦બુકિંગ અને પ્રશ્નો
Chair care and responsibility¦कुर्सियों की देखभाल और जिम्मेदारी¦ખુરશીઓની સંભાળ અને જવાબદારી
Deposit, cleanup and refund¦जमा, सफ़ाई और वापसी¦ડિપોઝિટ, સફાઈ અને રિફંડ
Noise, utilities and safety¦ध्वनि, सुविधाएँ और सुरक्षा¦અવાજ, સુવિધાઓ અને સુરક્ષા
No firecrackers¦पटाखे वर्जित हैं¦ફટાકડા પ્રતિબંધિત છે
Important safety rule¦महत्वपूर्ण सुरक्षा नियम¦મહત્વપૂર્ણ સુરક્ષા નિયમ
Celebrate responsibly¦जिम्मेदारी से उत्सव मनाएँ¦જવાબદારીથી ઉજવણી કરો
Good to know¦जानने योग्य बातें¦જાણવા જેવી બાબતો
How it works¦यह कैसे काम करता है¦આ કેવી રીતે કામ કરે છે
Simple booking process¦आसान बुकिंग प्रक्रिया¦સરળ બુકિંગ પ્રક્રિયા
Start a booking¦बुकिंग शुरू करें¦બુકિંગ શરૂ કરો
View all rules¦सभी नियम देखें¦બધા નિયમો જુઓ
With common plot booking¦कॉमन प्लॉट बुकिंग के साथ¦કોમન પ્લોટ બુકિંગ સાથે
Included with plot booking¦प्लॉट बुकिंग में शामिल¦પ્લોટ બુકિંગમાં સામેલ
Included with plots¦प्लॉट के साथ शामिल¦પ્લોટ સાથે સામેલ
Everything you need¦आपकी जरूरत की सभी सुविधाएँ¦તમને જોઈતી બધી સુવિધાઓ
One booking, all essentials¦एक बुकिंग, सभी जरूरी सुविधाएँ¦એક બુકિંગ, બધી જરૂરી સુવિધાઓ
Water & electricity¦पानी और बिजली¦પાણી અને વીજળી
Water and electricity¦पानी और बिजली¦પાણી અને વીજળી
Focus lights¦फ़ोकस लाइट¦ફોકસ લાઇટ
Talk to the booking team¦बुकिंग टीम से बात करें¦બુકિંગ ટીમ સાથે વાત કરો
Space for your celebration¦आपके उत्सव के लिए जगह¦તમારી ઉજવણી માટે જગ્યા
Choose what works for you¦अपने लिए सही विकल्प चुनें¦તમારા માટે યોગ્ય વિકલ્પ પસંદ કરો
Location type¦स्थान का प्रकार¦સ્થળનો પ્રકાર
Location details¦स्थान का विवरण¦સ્થળની વિગતો
Describe the emergency delivery location¦आपातकालीन डिलीवरी स्थान बताएँ¦કટોકટીના ડિલિવરી સ્થળની વિગતો આપો
Resident name / UPI recipient¦निवासी का नाम / UPI प्राप्तकर्ता¦રહેવાસીનું નામ / UPI પ્રાપ્તકર્તા
Acknowledgment or payout confirmation¦प्राप्ति या भुगतान की पुष्टि¦પ્રાપ્તિ કે ચુકવણીની પુષ્ટિ
Chair condition, cleaning, damage, or cancellation decision¦कुर्सियों की स्थिति, सफ़ाई, नुकसान या रद्दीकरण निर्णय¦ખુરશીઓની સ્થિતિ, સફાઈ, નુકસાન કે રદ કરવાનો નિર્ણય
e.g. Birthday celebration¦जैसे, जन्मदिन का उत्सव¦દા.ત. જન્મદિવસની ઉજવણી
e.g. Mehta family celebration¦जैसे, मेहता परिवार का उत्सव¦દા.ત. મહેતા પરિવારની ઉજવણી
e.g. Lift Repair¦जैसे, लिफ़्ट की मरम्मत¦દા.ત. લિફ્ટનું સમારકામ
e.g. Correcting an extra charge¦जैसे, अतिरिक्त शुल्क सुधारना¦દા.ત. વધારાનો ચાર્જ સુધારવો
Community celebrations, made simple¦सामुदायिक उत्सव, अब आसान¦સામૂહિક ઉજવણી, હવે સરળ
Plan your next gathering¦अपने अगले कार्यक्रम की योजना बनाएँ¦તમારા આગામી કાર્યક્રમનું આયોજન કરો
Your Community,¦आपकी सोसाइटी,¦તમારી સોસાયટી,
Digitalized.¦अब डिजिटल।¦હવે ડિજિટલ.
Trusted by 120+ Families¦120+ परिवारों का भरोसा¦120+ પરિવારોનો વિશ્વાસ
Your community at a glance¦एक नज़र में आपकी सोसाइटी¦એક નજરમાં તમારી સોસાયટી
Your society account¦आपका सोसाइटी खाता¦તમારું સોસાયટી ખાતું
Bills and payments¦बिल और भुगतान¦બિલ અને ચુકવણીઓ
Your payment record¦आपका भुगतान रिकॉर्ड¦તમારો ચુકવણી રેકૉર્ડ
Every payment, in one place¦हर भुगतान, एक ही जगह¦દરેક ચુકવણી, એક જ જગ્યાએ
Review with confidence¦विश्वास के साथ समीक्षा करें¦વિશ્વાસ સાથે સમીક્ષા કરો
Society accounts¦सोसाइटी के खाते¦સોસાયટીનાં ખાતાં
A clearer view of the books¦खातों की स्पष्ट जानकारी¦ખાતાંની સ્પષ્ટ માહિતી
Your community inbox¦आपकी सोसाइटी का इनबॉक्स¦તમારી સોસાયટીનું ઇનબૉક્સ
Stay in the loop¦जानकारी से जुड़े रहें¦માહિતીથી જોડાયેલા રહો
Around the society¦सोसाइटी में आस-पास¦સોસાયટીની આસપાસ
The community notice board¦सोसाइटी का सूचना पटल¦સોસાયટીનું સૂચના બોર્ડ
Here to help¦आपकी मदद के लिए¦તમારી મદદ માટે
Help when you need it¦जब ज़रूरत हो, मदद पाएँ¦જ્યારે જરૂર હોય ત્યારે મદદ મેળવો
People and places¦लोग और जगहें¦લોકો અને સ્થળો
Know your community¦अपनी सोसाइटी को जानें¦તમારી સોસાયટીને જાણો
Society spending¦सोसाइटी का खर्च¦સોસાયટીનો ખર્ચ
Every expense has a story¦हर खर्च का पूरा विवरण¦દરેક ખર્ચની સંપૂર્ણ વિગતો
Make yourself at home¦अपनापन महसूस करें¦પોતાના ઘર જેવું અનુભવો
Your community¦आपकी सोसाइटी¦તમારી સોસાયટી
Sur Shakti Residency • Financial Health¦सुर शक्ति रेज़िडेंसी • वित्तीय स्थिति¦સુર શક્તિ રેસિડન્સી • નાણાકીય સ્થિતિ
Request submitted for review¦अनुरोध समीक्षा के लिए भेजा गया¦વિનંતી સમીક્ષા માટે મોકલાઈ
Booking cancelled¦बुकिंग रद्द हुई¦બુકિંગ રદ થઈ
Booking rejected¦बुकिंग अस्वीकृत¦બુકિંગ નામંજૂર
Payment verification¦भुगतान सत्यापन¦ચુકવણી ચકાસણી
Booking confirmed¦बुकिंग की पुष्टि हुई¦બુકિંગની પુષ્ટિ થઈ
Event day¦कार्यक्रम का दिन¦કાર્યક્રમનો દિવસ
Inspection & settlement¦जाँच और निपटान¦તપાસ અને પતાવટ
Refund & closure¦वापसी और समापन¦રિફંડ અને સમાપન
Awaiting full payment¦पूरे भुगतान की प्रतीक्षा¦સંપૂર્ણ ચુકવણીની રાહમાં
Plot and chairs reserved¦प्लॉट और कुर्सियाँ आरक्षित¦પ્લોટ અને ખુરશીઓ આરક્ષિત
Confirms after payment¦भुगतान के बाद पुष्टि¦ચુકવણી પછી પુષ્ટિ
Payment recorded¦भुगतान दर्ज हुआ¦ચુકવણી નોંધાઈ
Booking requested¦बुकिंग का अनुरोध किया गया¦બુકિંગની વિનંતી કરાઈ
`;

export const messages = Object.fromEntries((labels + '\n' + guidance).trim().split('\n').filter(Boolean).map(line => {
  const [english, hi, gu] = line.split('¦');
  if (!english || !hi || !gu) throw new Error(`Invalid translation: ${english}`);
  return [english.trim().toLowerCase(), { hi, gu }];
}));
