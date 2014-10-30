"""
Copyright 2014 Sotera Defense Solutions, Inc.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
"""

import re
import json

import tangelo
import cherrypy
import datawaketools.datawake_db as db

from users import is_in_session
from validate_parameters import required_parameters
import users


"""
 List / Create Trails

    primarily used on the plugin newTab.

"""

#
# Perform a starts-with search for trails
#
@is_in_session
@required_parameters(['domain'])
def get_trails(domain):
    org = users.get_org()
    return get_trails_for_domain_and_org(org, domain)


def get_trails_for_domain_and_org(org, domain):
    trails = db.listTrails(org, domain)
    response = dict(trails=trails)
    return json.dumps(response)

@is_in_session
@required_parameters(['domain', 'trailname'])
def add_trail(trailname, domain, traildescription=u''):
    tangelo.log('datawake_trails POST trailname=%s traildescription=%s domain=%s' % (trailname, traildescription, domain))
    user = users.get_user()
    org = user.get('org')
    invalid = re.match('^[\w]*(?!:)+$', trailname) is None
    if invalid:
        raise ValueError("Trail names must be alphanumeric and not contain a ':'")
    last_row = db.addTrail(org, trailname, traildescription, user.get('email'), domain=domain)
    return json.dumps(dict(success=last_row >= 0))


post_actions = {
    'trails': get_trails,
    'createTrail': add_trail
}


@tangelo.restful
def post(action, *args, **kwargs):
    body = cherrypy.request.body.read()
    post_data = json.loads(body, strict=False)

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(404, "unknown service call")

    return post_actions.get(action, unknown)(**post_data)