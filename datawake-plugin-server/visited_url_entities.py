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

import json
import tangelo
import cherrypy
import datawaketools.entity_data_connector_factory as factory


"""
  Return the list of entities extracted from a url

"""

def getUser():
    assert ('user' in cherrypy.session)
    user = cherrypy.session['user']
    assert ('org' in user)
    return user


def get_entities(url=u'', domain=u''):
    # tangelo.log('visited_url_entities url='+url+" domian="+domain)
    if url == u'' or domain == u'':
        raise ValueError("visited_url_entities GET url and domain must be specified. url:" + url + " domain:" + domain)
    user = getUser()
    userId = user['userId']
    org = user['org']
    entityDataConnector = factory.getEntityDataConnector()
    results = entityDataConnector.getVisitedEntities(userId, url, org, domain=domain)
    entityDataConnector.close()
    #tangelo.log(str(results))
    return json.dumps(results)


post_actions = {
    'entities': get_entities
}


@tangelo.restful
def post(action, *args, **kwargs):
    post_data = json.loads(cherrypy.request.body.read(), strict=False)

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(404, "unknown service call")

    return post_actions.get(action, unknown)(**post_data)


