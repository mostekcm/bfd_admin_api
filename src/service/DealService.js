import _ from 'lodash';
import request from 'superagent';
import moment from 'moment';

import logger from '../logger';

import CrmService from './CrmService';

export default class DealService {
  constructor(adminId) {
    this.crmService = new CrmService(adminId);
  }

  static mapHubSpotDealsToIdList(deals) {
    const mapping = { missing: [] };
    if (!deals) return mapping;
    deals.forEach((deal) => {
      const orderNumber = deal.properties.order_number.value;
      if (orderNumber) {
        mapping[orderNumber] = deal.dealId;
      } else {
        mapping.missing.push(deal.dealId);
      }
    });
    return mapping;
  }

  getDealsForCompany(companyId) {
    return this.crmService.getAccessToken()
      .then(accessToken => request
        .get(`https://api.hubapi.com/deals/v1/deal/associated/company/${companyId}/paged?properties=order_number`)
        .set('Authorization', `Bearer ${accessToken}`)
        .then(response => DealService.mapHubSpotDealsToIdList(response.body.deals)));
  }

  getCompanyId(order) {
    if (order.store.id) return Promise.resolve(order.store.id);

    return this.crmService.getShortCompanyByName(order.store.name)
      .then(company => company && company.id);
  }

  buildDeal(order) {
    const properties = [
      {
        name: 'dealstage',
        value: order.dealStage
      },
      {
        name: 'dealname',
        value: `${order.invoiceNumber} for ${order.store.name}`
      },
      {
        name: 'amount',
        value: order.totals.total
      },
      {
        name: 'order_number',
        value: order.invoiceNumber
      }];
    switch (order.dealStage) {
      case 'Closed Won':
        properties.push({
          name: 'closedate',
          value: parseInt(moment(moment.unix(order.shippedDate).format('YYYY-MM-DDT00:00:00.000Z')).unix() + '000', 10)
        });

        break;
      case 'Closed Lost':
        properties.push({
          name: 'closedate',
          value: parseInt(moment().unix() + '000', 10)
        });
        break;
      case 'Approved':
        break;
      case 'Pending Approval':
        break;
      case 'Qualifying':
        break;
      default:
        break;
    }

    return this.getCompanyId(order)
      .then((companyId) => {
        if (!companyId) return Promise.reject('Could not find company: ' + order.store.name);
        const associations = {
          associatedCompanyIds: [
            companyId
          ],
          associatedVids: _.map(order.store.contacts || {}, contact => contact.id)
        };

        return {
          associations,
          properties
        };
      });
  }

  createDeal(order) {
    return this.buildDeal(order)
      .then(dealProperties => this.crmService.getAccessToken()
        .then(accessToken => request
          .post('https://api.hubapi.com/deals/v1/deal')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(dealProperties)))
      .then(response => response.body.dealId)
      .catch((err) => {
        logger.error(err);
        return Promise.reject(err);
      });
  }

  updateDealStage(dealId, order) {
    return this.buildDeal(order)
      .then(dealProperties => this.crmService.getAccessToken()
        .then(accessToken => request
          .put(`https://api.hubapi.com/deals/v1/deal/${dealId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(dealProperties)))
      .then(response => response.body.dealId);
  }
}
